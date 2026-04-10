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
import { mapCinetPayMethod } from "@/lib/utils"; // ✅ Import du traducteur strict
import { TxClient, CinetPayApiData } from "@/services/billing/types"; // ✅ Typage unifié (DRY)

// =============================================================================
// 🔧 CONFIGURATION FINANCIÈRE LOCATIVE
// =============================================================================
const FEES = {
  TENANT_ENTRANCE_FEE: 20000,
  PLATFORM_RECURRING_RATE: 0.05,
  AGENT_SUCCESS_FEE_RATE: 0.05,
  AGENCY_DEFAULT_RATE: 0.10
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
// 🚀 MOTEUR DE TRAITEMENT (REAL ESTATE)
// =============================================================================
export async function processRealEstatePayment(
    tx: TxClient, 
    paymentRecord: PaymentWithRelations, 
    isValidPayment: boolean, 
    amountPaid: number, 
    transactionId: string, 
    apiData: CinetPayApiData
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
                providerResponse: errorResponse as any // Maintien du type Prisma.InputJsonObject
            }
        });
        return;
    }

    // ✅ MAPPER STRICT : Protection contre le crash Prisma P2009
    const safeProvider = mapCinetPayMethod(apiData.payment_method);

    // =========================================================================
    // SCÉNARIO A : PAIEMENT D'UN LOYER OU D'UNE CAUTION (Bail / Lease)
    // =========================================================================
    const lease = paymentRecord.lease;
    const property = lease?.property;

    if (lease && property) {
        let platformShare = 0, agentShare = 0, agencyShare = 0, ownerShare = 0;
        const baseRent = lease.monthlyRent;
        const appliedAgencyRate = lease.agencyCommissionRate || FEES.AGENCY_DEFAULT_RATE;

        // Calcul des répartitions financières (Split)
        if (paymentRecord.type === "DEPOSIT") {
            platformShare = FEES.TENANT_ENTRANCE_FEE + Math.floor(baseRent * FEES.PLATFORM_RECURRING_RATE);
            if (lease.agentId) agentShare = Math.floor(baseRent * FEES.AGENT_SUCCESS_FEE_RATE);
            if (property.agencyId) agencyShare = Math.floor(baseRent * appliedAgencyRate);
            ownerShare = amountPaid - platformShare - agentShare - agencyShare;
        } else {
            platformShare = Math.floor(amountPaid * FEES.PLATFORM_RECURRING_RATE);
            if (property.agencyId) agencyShare = Math.floor(amountPaid * appliedAgencyRate);
            ownerShare = amountPaid - platformShare - agencyShare;
        }

        // Récupération de l'ID Super Admin HORS transaction
        let superAdminId: string | null = null;
        if (platformShare > 0) {
            const superAdmin = await prisma.user.findFirst({ 
                where: { role: Role.SUPER_ADMIN },
                select: { id: true }
            });
            superAdminId = superAdmin?.id || null;
        }

        // Distribution au Propriétaire (Via UserFinance)
        const ownerId = property.ownerId;
        await tx.userFinance.update({ where: { userId: ownerId }, data: { walletBalance: { increment: ownerShare } } });
        await tx.transaction.create({ data: { amount: ownerShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Loyer/Caution (Net) - ${property.title}`, userId: ownerId, reference: `OWNER-${transactionId}`, balanceType: BalanceType.WALLET } });

        // Distribution à l'Agence (Direct, pas de UserFinance ici)
        const agency = property.agency;
        if (agency && agencyShare > 0) {
            await tx.agency.update({ where: { id: agency.id }, data: { walletBalance: { increment: agencyShare } } });
            await tx.agencyTransaction.create({ data: { amount: agencyShare, type: 'CREDIT', status: 'SUCCESS', reason: `Commission Agence - ${property.title}`, agencyId: agency.id } });
        }

        // Distribution à l'Agent (Via UserFinance)
        const agentId = lease.agentId;
        if (agentId && agentShare > 0) {
            await tx.userFinance.update({ where: { userId: agentId }, data: { walletBalance: { increment: agentShare } } });
            await tx.transaction.create({ data: { amount: agentShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Commission Agent - ${property.title}`, userId: agentId, reference: `AGT-${transactionId}`, balanceType: BalanceType.WALLET } });
        }

        // Distribution à la Plateforme (Via UserFinance)
        if (platformShare > 0 && superAdminId) {
            await tx.userFinance.update({ where: { userId: superAdminId }, data: { walletBalance: { increment: platformShare } } });
            await tx.transaction.create({ data: { amount: platformShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Frais Plateforme - ${transactionId}`, userId: superAdminId, reference: `PLAT-${transactionId}`, balanceType: BalanceType.WALLET } });
        }

        // Activation du bail si premier paiement
        if (lease.status === LeaseStatus.PENDING && paymentRecord.type === "DEPOSIT") {
            await tx.lease.update({ where: { id: lease.id }, data: { status: LeaseStatus.ACTIVE, isActive: true } });
        }

        const successResponse = {
            payment_method: apiData.payment_method,
            status: apiData.status,
            amount: apiData.amount,
            payment_date: apiData.payment_date || new Date().toISOString()
        };

        // Clôture du Paiement (Crash Evité : provider validé)
        await tx.payment.update({ 
            where: { id: paymentRecord.id }, 
            data: { 
                status: PaymentStatus.SUCCESS, 
                method: safeProvider, // 👈 CORRECTION FORTE
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
        await tx.quote.update({ where: { id: paymentRecord.quoteId }, data: { status: 'PAID' } });
        
        // Crash Evité : provider validé
        await tx.payment.update({ 
            where: { id: paymentRecord.id }, 
            data: { status: PaymentStatus.SUCCESS, method: safeProvider } 
        });

        const artisanId = paymentRecord.quote.artisanId;
        // Correction walletBalance (Via UserFinance)
        await tx.userFinance.update({ where: { userId: artisanId }, data: { walletBalance: { increment: paymentRecord.amount } } });
        await tx.transaction.create({ data: { amount: paymentRecord.amount, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Paiement du devis #${paymentRecord.quote.number}`, userId: artisanId, quoteId: paymentRecord.quoteId, reference: `QUOTE-${transactionId}`, balanceType: BalanceType.WALLET } });
    }
    
    // =========================================================================
    // SCÉNARIO C : RECHARGEMENT / TOP-UP
    // =========================================================================
    else if (paymentRecord.type === "TOPUP" || paymentRecord.type === "CHARGES") {
        const targetUserId = paymentRecord.userId as string | null; 

        if (targetUserId) {
            // Correction walletBalance (Via UserFinance)
            await tx.userFinance.update({ where: { userId: targetUserId }, data: { walletBalance: { increment: paymentRecord.amount } } });
            await tx.transaction.create({ data: { userId: targetUserId, amount: paymentRecord.amount, type: TransactionType.CREDIT, balanceType: BalanceType.WALLET, status: 'SUCCESS', reason: "Rechargement", reference: `TOPUP-${transactionId}` } });
            
            // Crash Evité : provider validé
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
