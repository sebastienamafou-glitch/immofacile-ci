import { 
    Prisma, 
    PaymentStatus, 
    TransactionType, 
    BalanceType, 
    LeaseStatus, 
    Role 
} from "@prisma/client";
import { logActivity } from "@/lib/logger";
import { prisma } from "@/lib/prisma"; // Nécessaire pour les requêtes hors transaction

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
// 🛡️ TYPAGE STRICT EXPORTÉ (Pour réutilisation dans le Webhook)
// =============================================================================
export type TxClient = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    lease: { include: { property: { include: { agency: true } } } },
    quote: { include: { artisan: true } }
  }
}>;

export interface CinetPayApiData {
    payment_method: string;
    status: string;
    amount: string;
    currency?: string;
    description?: string;
    payment_date?: string;
}

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
        // Construction d'un objet propre compatible nativement avec Prisma.InputJsonObject
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
                providerResponse: errorResponse 
            }
        });
        return;
    }

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

        // Récupération de l'ID Super Admin HORS transaction pour éviter les Range Locks
        // Note: L'ID est garanti immuable sur la durée de l'exécution
        let superAdminId: string | null = null;
        if (platformShare > 0) {
            const superAdmin = await prisma.user.findFirst({ 
                where: { role: Role.SUPER_ADMIN },
                select: { id: true }
            });
            superAdminId = superAdmin?.id || null;
        }

        // Distribution au Propriétaire
        const ownerId = property.ownerId;
        await tx.user.update({ where: { id: ownerId }, data: { walletBalance: { increment: ownerShare } } });
        await tx.transaction.create({ data: { amount: ownerShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Loyer/Caution (Net) - ${property.title}`, userId: ownerId, reference: `OWNER-${transactionId}`, balanceType: BalanceType.WALLET } });

        // Distribution à l'Agence
        const agency = property.agency;
        if (agency && agencyShare > 0) {
            await tx.agency.update({ where: { id: agency.id }, data: { walletBalance: { increment: agencyShare } } });
            await tx.agencyTransaction.create({ data: { amount: agencyShare, type: 'CREDIT', status: 'SUCCESS', reason: `Commission Agence - ${property.title}`, agencyId: agency.id } });
        }

        // Distribution à l'Agent
        const agentId = lease.agentId;
        if (agentId && agentShare > 0) {
            await tx.user.update({ where: { id: agentId }, data: { walletBalance: { increment: agentShare } } });
            await tx.transaction.create({ data: { amount: agentShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Commission Agent - ${property.title}`, userId: agentId, reference: `AGT-${transactionId}`, balanceType: BalanceType.WALLET } });
        }

        // Distribution à la Plateforme
        if (platformShare > 0 && superAdminId) {
            await tx.user.update({ where: { id: superAdminId }, data: { walletBalance: { increment: platformShare } } });
            await tx.transaction.create({ data: { amount: platformShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Frais Plateforme - ${transactionId}`, userId: superAdminId, reference: `PLAT-${transactionId}`, balanceType: BalanceType.WALLET } });
        }

        // Activation du bail si premier paiement
        if (lease.status === LeaseStatus.PENDING && paymentRecord.type === "DEPOSIT") {
            await tx.lease.update({ where: { id: lease.id }, data: { status: LeaseStatus.ACTIVE, isActive: true } });
        }

        // Clôture du Paiement
        const successResponse = {
            payment_method: apiData.payment_method,
            status: apiData.status,
            amount: apiData.amount,
            payment_date: apiData.payment_date || new Date().toISOString()
        };

        await tx.payment.update({ 
            where: { id: paymentRecord.id }, 
            data: { 
                status: PaymentStatus.SUCCESS, 
                method: apiData.payment_method || "UNKNOWN", 
                providerResponse: successResponse,
                amountOwner: ownerShare,
                amountPlatform: platformShare,
                amountAgent: agentShare,
                amountAgency: agencyShare
            } 
        });

        // ✅ TYPAGE STRICT : Plus aucun "as any"
        await logActivity({ action: "PAYMENT_SUCCESS", entityId: transactionId, entityType: "PAYMENT", userId: ownerId, metadata: { amount: amountPaid, type: "LEASE_RENT" } });
    }
    
    // =========================================================================
    // SCÉNARIO B : PAIEMENT D'UN DEVIS ARTISAN (Quote)
    // =========================================================================
    else if (paymentRecord.quote && paymentRecord.quoteId) {
        await tx.quote.update({ where: { id: paymentRecord.quoteId }, data: { status: 'PAID' } });
        await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: PaymentStatus.SUCCESS } });

        const artisanId = paymentRecord.quote.artisanId;
        await tx.user.update({ where: { id: artisanId }, data: { walletBalance: { increment: paymentRecord.amount } } });
        await tx.transaction.create({ data: { amount: paymentRecord.amount, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Paiement du devis #${paymentRecord.quote.number}`, userId: artisanId, quoteId: paymentRecord.quoteId, reference: `QUOTE-${transactionId}`, balanceType: BalanceType.WALLET } });
    }
    
    // =========================================================================
    // SCÉNARIO C : RECHARGEMENT / TOP-UP
    // =========================================================================
    else if (paymentRecord.type === "TOPUP" || paymentRecord.type === "CHARGES") {
        const targetUserId = paymentRecord.userId as string | null; // Protection de type

        if (targetUserId) {
            await tx.user.update({ where: { id: targetUserId }, data: { walletBalance: { increment: paymentRecord.amount } } });
            await tx.transaction.create({ data: { userId: targetUserId, amount: paymentRecord.amount, type: TransactionType.CREDIT, balanceType: BalanceType.WALLET, status: 'SUCCESS', reason: "Rechargement", reference: `TOPUP-${transactionId}` } });
            await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: PaymentStatus.SUCCESS, method: apiData.payment_method || "UNKNOWN" } });
        } else {
            console.error(`[Alerte TopUp] Paiement ${paymentRecord.id} orphelin. Aucun userId attaché.`);
            await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: PaymentStatus.FAILED } });
        }
    }
}
