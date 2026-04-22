import { 
    Prisma, 
    PaymentStatus, 
    TransactionType, 
    BalanceType, 
    LeaseStatus, 
    Role 
} from "@prisma/client";
import { logActivity } from "@/lib/logger";
import { prisma } from "@/lib/prisma"; 
import { mapCinetPayMethod } from "@/lib/utils";
import { TxClient, CinetPayApiData } from "@/services/billing/types";

// =============================================================================
// 🔧 CONFIGURATION FINANCIÈRE LOCATIVE (CONFORMITÉ CÔTE D'IVOIRE)
// =============================================================================
const FEES = {
  TENANT_ENTRANCE_FEE: 20000,
  PLATFORM_RECURRING_RATE: 0.05,
  AGENT_SUCCESS_FEE_RATE: 0.05,
  AGENCY_DEFAULT_RATE: 0.08, // ⚖️ Plafond légal rabaissé à 8%
  VAT_RATE: 0.18 // ⚖️ TVA ivoirienne applicable sur les honoraires (18%)
};

// =============================================================================
// 🛡️ TYPAGE STRICT EXPORTÉ 
// =============================================================================
export type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    lease: { include: { property: { include: { agency: true } } } },
    quote: { include: { artisan: true } }
  }
}>;

// =============================================================================
// 🚀 MOTEUR DE TRAITEMENT (REAL ESTATE) - OPTION A (Direct Payment)
// =============================================================================
export async function processRealEstatePayment(
    tx: TxClient, 
    paymentRecord: PaymentWithRelations, 
    isValidPayment: boolean, 
    amountPaid: number, 
    transactionId: string, 
    apiData: CinetPayApiData,
    superAdminId: string | null
) {
    // 1. IDEMPOTENCE STRICTE
    if (paymentRecord.status === PaymentStatus.SUCCESS) return;

    // 2. ÉCHEC DE PAIEMENT
    if (!isValidPayment) {
        await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: PaymentStatus.FAILED } });
        return;
    }

    // 3. FRAUDE AU MONTANT (Protection Anti-Tampering)
    if (amountPaid !== paymentRecord.amount) {
        const errorResponse = {
            payment_method: apiData.payment_method || "UNKNOWN",
            status: apiData.status || "FAILED",
            amount_received: apiData.amount || "0",
            error_reason: "AMOUNT_MISMATCH_REJECTED"
        };

        await tx.payment.update({ 
            where: { id: paymentRecord.id }, 
            data: { 
                status: PaymentStatus.FAILED, 
                providerResponse: errorResponse as any
            }
        });
        return;
    }

    const safeProvider = mapCinetPayMethod(apiData.payment_method);

    // =========================================================================
    // SCÉNARIO A : PAIEMENT D'UN LOYER OU D'UNE CAUTION (Bail / Lease)
    // =========================================================================
    const lease = paymentRecord.lease;
    const property = lease?.property;

    if (lease && property) {
        let platformShare = 0, agentShare = 0, agencyShare = 0, ownerShare = 0;
        const baseRent = lease.monthlyRent;
        let appliedAgencyRate = lease.agencyCommissionRate || FEES.AGENCY_DEFAULT_RATE;

        // 🛡️ RECHERCHE DU MANDAT DE GESTION ACTIF
        if (property.agencyId) {
            const activeMandate = await tx.managementMandate.findFirst({
                where: {
                    propertyId: property.id,
                    agencyId: property.agencyId,
                    status: "ACTIVE"
                }
            });
            
            if (activeMandate) {
                // Le taux du mandat (divisé par 100)
                appliedAgencyRate = activeMandate.commissionRate / 100;
            }
        }

        // ⚖️ VERROU LÉGAL : Plafond strict à 8% maximum pour la gestion courante
        appliedAgencyRate = Math.min(appliedAgencyRate, 0.08);

        let agencyManagementFeeHT = 0;
        let totalAgencyShare = 0;

        // Calcul des répartitions financières (Split)
        if (paymentRecord.type === "DEPOSIT") {
            // 1. Frais de plateforme
            platformShare = FEES.TENANT_ENTRANCE_FEE + Math.floor(baseRent * FEES.PLATFORM_RECURRING_RATE);
            
            // 2. Commission de l'agent (sur le loyer de base)
            if (lease.agentId) agentShare = Math.floor(baseRent * FEES.AGENT_SUCCESS_FEE_RATE);
            
            // 3. Rémunération de l'Agence (Honoraires de signature + Frais de gestion sur le 1er mois)
            if (property.agencyId) {
                agencyManagementFeeHT = Math.floor(baseRent * appliedAgencyRate);
                const agencyManagementFeeTTC = Math.floor(agencyManagementFeeHT * (1 + FEES.VAT_RATE));
                
                // On additionne les frais de gestion TTC + la part Locataire + la part Propriétaire
                totalAgencyShare = agencyManagementFeeTTC + lease.tenantLeasingFee + lease.ownerLeasingFee;
            }
            
            agencyShare = totalAgencyShare;

            // 4. Net Propriétaire = Ce que le locataire a payé - toutes les commissions
            // Note : Le locataire a payé (Caution + Avance + tenantLeasingFee). 
            // La caution lui appartient, le tenantLeasingFee va à l'agence. 
            // Le propriétaire paie les frais de plateforme, l'agent, le managementFee et son ownerLeasingFee.
            ownerShare = amountPaid - platformShare - agentShare - agencyShare;

        } else {
            // Logique classique pour les loyers suivants (Mensualités standards)
            platformShare = Math.floor(amountPaid * FEES.PLATFORM_RECURRING_RATE);
            
            if (property.agencyId) {
                agencyManagementFeeHT = Math.floor(amountPaid * appliedAgencyRate);
                agencyShare = Math.floor(agencyManagementFeeHT * (1 + FEES.VAT_RATE));
            }
            
            ownerShare = amountPaid - platformShare - agencyShare;
        }

        // 🚨 OPTION A : Les fonds vont directement sur les comptes Wave/OM.
        // Nous enregistrons uniquement les "Transactions" pour l'historique et la comptabilité,
        // mais nous NE créditons PLUS les walletBalance internes (sauf pour la plateforme).

        // Distribution au Propriétaire (Mise à jour du Wallet + Historique)
        const ownerId = property.ownerId;
        await tx.userFinance.update({ where: { userId: ownerId }, data: { walletBalance: { increment: ownerShare } } });
        await tx.transaction.create({ data: { amount: ownerShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Loyer/Caution (Net) - ${property.title}`, userId: ownerId, reference: `OWNER-${transactionId}`, balanceType: BalanceType.WALLET } });

        // Distribution à l'Agence (Mise à jour du Wallet + Historique)
        const agency = property.agency;
        if (agency && agencyShare > 0) {
            await tx.agency.update({ where: { id: agency.id }, data: { walletBalance: { increment: agencyShare } } });
            await tx.agencyTransaction.create({ data: { amount: agencyShare, type: 'CREDIT', status: 'SUCCESS', reason: `Commission Agence - ${property.title}`, agencyId: agency.id } });
        }

        // Distribution à l'Agent (Historique uniquement)
        const agentId = lease.agentId;
        if (agentId && agentShare > 0) {
            await tx.transaction.create({ data: { amount: agentShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Commission Agent - ${property.title}`, userId: agentId, reference: `AGT-${transactionId}`, balanceType: BalanceType.WALLET } });
        }

        // Distribution à la Plateforme (Conserve le walletBalance car l'argent reste chez Babimmo)
        if (platformShare > 0 && superAdminId) {
            await tx.userFinance.update({ where: { userId: superAdminId }, data: { walletBalance: { increment: platformShare } } });
            await tx.transaction.create({ data: { amount: platformShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Frais Plateforme - ${transactionId}`, userId: superAdminId, reference: `PLAT-${transactionId}`, balanceType: BalanceType.WALLET } });
        }

        // ✅ LE FAMEUX CLOSING : Activation du bail si premier paiement
        if (lease.status === LeaseStatus.PENDING && paymentRecord.type === "DEPOSIT") {
            await tx.lease.update({ where: { id: lease.id }, data: { status: LeaseStatus.ACTIVE, isActive: true } });
        }

        const successResponse = {
            payment_method: apiData.payment_method,
            status: apiData.status,
            amount: apiData.amount,
            payment_date: apiData.payment_date || new Date().toISOString()
        };

        // Clôture du Paiement
        await tx.payment.update({ 
            where: { id: paymentRecord.id }, 
            data: { 
                status: PaymentStatus.SUCCESS, 
                method: safeProvider,
                providerResponse: successResponse as any,
                amountOwner: ownerShare,
                amountPlatform: platformShare,
                amountAgent: agentShare,
                amountAgency: agencyShare
            } 
        });

        await logActivity({ action: "PAYMENT_SUCCESS", entityId: transactionId, entityType: "PAYMENT", userId: ownerId, metadata: { amount: amountPaid, type: "LEASE_RENT" } });
    }
    
    // =========================================================================
    // SCÉNARIO B : PAIEMENT D'UN DEVIS ARTISAN (Quote)
    // =========================================================================
    else if (paymentRecord.quote && paymentRecord.quoteId) {
        
        // 1. Le devis passe en statut PAYÉ
        await tx.quote.update({ 
            where: { id: paymentRecord.quoteId }, 
            data: { status: 'PAID' } 
        });

        // 2. 🚀 L'incident passe en "IN_PROGRESS" (Débloque l'UI Artisan)
        await tx.incident.update({
            where: { id: paymentRecord.quote.incidentId },
            data: { status: 'IN_PROGRESS' }
        });
        
        // 3. Mise à jour du statut de paiement
        await tx.payment.update({ 
            where: { id: paymentRecord.id }, 
            data: { status: PaymentStatus.SUCCESS, method: safeProvider } 
        });

        const artisanId = paymentRecord.quote.artisanId;

        // 4. 🔒 CONSIGNATION : L'argent va dans l'Escrow Balance de l'artisan !
        await tx.userFinance.upsert({
            where: { userId: artisanId },
            create: { 
                userId: artisanId, 
                escrowBalance: paymentRecord.amount 
            },
            update: { 
                escrowBalance: { increment: paymentRecord.amount } 
            }
        });

        // 5. Trace de la transaction (Marquée en ESCROW)
        await tx.transaction.create({ 
            data: { 
                amount: paymentRecord.amount, 
                type: TransactionType.CREDIT, 
                status: 'SUCCESS', 
                reason: `Consignation - Devis #${paymentRecord.quote.number}`, 
                userId: artisanId, 
                quoteId: paymentRecord.quoteId, 
                reference: `QUOTE-${transactionId}`, 
                balanceType: BalanceType.ESCROW // 🔒 Précision comptable
            } 
        });

        // 6. Notification Push pour l'artisan
        await tx.notification.create({
            data: {
                userId: artisanId,
                title: "🎉 Devis Payé ! Démarrage autorisé",
                message: `Les fonds (${paymentRecord.amount.toLocaleString('fr-FR')} FCFA) ont été consignés. Vous pouvez intervenir sur le chantier.`,
                type: "SUCCESS",
                link: `/dashboard/artisan/incidents/${paymentRecord.quote.incidentId}`
            }
        });
    }
    
    // =========================================================================
    // SCÉNARIO C : RECHARGEMENT / TOP-UP
    // =========================================================================
    else if (paymentRecord.type === "TOPUP" || paymentRecord.type === "CHARGES") {
        const targetUserId = paymentRecord.userId as string | null; 

        if (targetUserId) {
            // 🚨 ICI ON CONSERVE LE WALLET : Un TopUp a pour but explicite de créditer le portefeuille interne
            await tx.userFinance.update({ where: { userId: targetUserId }, data: { walletBalance: { increment: paymentRecord.amount } } });
            await tx.transaction.create({ data: { userId: targetUserId, amount: paymentRecord.amount, type: TransactionType.CREDIT, balanceType: BalanceType.WALLET, status: 'SUCCESS', reason: "Rechargement", reference: `TOPUP-${transactionId}` } });
            
            await tx.payment.update({ 
                where: { id: paymentRecord.id }, 
                data: { status: PaymentStatus.SUCCESS, method: safeProvider } 
            });
        } else {
            console.error(`[Alerte TopUp] Paiement ${paymentRecord.id} orphelin. Aucun userId attaché.`);
            await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: PaymentStatus.FAILED } });
        }
    }
}
