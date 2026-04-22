import { 
    Prisma, 
    InvestmentContract, 
    Role, 
    TransactionType, 
    BalanceType,
    InvestmentStatus
} from "@prisma/client";
import { logActivity } from "@/lib/logger";
import { TxClient } from "@/services/billing/types"; 

// =============================================================================
// 🚀 MOTEUR DE TRAITEMENT (CROWDFUNDING & INVESTISSEMENT)
// =============================================================================
export async function processInvestmentPayment(
    tx: TxClient, 
    investmentContract: InvestmentContract, 
    isValidPayment: boolean, 
    amountPaid: number, 
    transactionId: string,
    superAdminId: string | null // ✅ Ajout du 6ème argument pour TypeScript et patch stabilité
) {
    if (investmentContract.status === InvestmentStatus.ACTIVE || investmentContract.status === InvestmentStatus.COMPLETED) return;

    if (!isValidPayment) {
        await tx.investmentContract.update({ 
            where: { id: investmentContract.id }, 
            data: { status: InvestmentStatus.CANCELLED } 
        });
        return;
    }

    if (amountPaid !== investmentContract.amount) {
        console.error(`🚨 [Alerte Fraude] Investissement ${investmentContract.id} : attendu ${investmentContract.amount}, reçu ${amountPaid}`);
        await tx.investmentContract.update({ 
            where: { id: investmentContract.id }, 
            data: { status: InvestmentStatus.CANCELLED } 
        });
        return;
    }

    await tx.investmentContract.update({ 
        where: { id: investmentContract.id }, 
        data: { status: InvestmentStatus.ACTIVE } 
    });

    let newRole: Role = Role.GUEST; 
    let isPremium = false;
    
    if (amountPaid >= 500000) {
        newRole = Role.INVESTOR; 
        isPremium = true;
    } else if (amountPaid >= 50000) {
        newRole = Role.AMBASSADOR; 
        isPremium = true;
    }

    await tx.user.update({ 
        where: { id: investmentContract.userId }, 
        data: { 
            role: newRole, 
            isBacker: true,
            isPremium: isPremium
        } 
    });

    // Validation comptable : Encaissement des fonds sur le compte Plateforme
    // ✅ Utilisation du superAdminId pré-résolu (fini les lectures hors snapshot)
    if (superAdminId) {
        await tx.userFinance.update({
            where: { userId: superAdminId },
            data: { walletBalance: { increment: amountPaid } }
        });
        
        await tx.transaction.create({
            data: {
                amount: amountPaid,
                type: TransactionType.CREDIT,
                status: 'SUCCESS',
                reason: `Investissement Crowdfunding - Contrat #${investmentContract.id}`,
                userId: superAdminId,
                reference: `INV-PLAT-${transactionId}`,
                balanceType: BalanceType.WALLET
            }
        });
    }

    await logActivity({ 
        action: "CROWDFUNDING_SUCCESS", 
        entityId: transactionId, 
        entityType: "INVESTMENT", 
        userId: investmentContract.userId, 
        metadata: { amount: amountPaid, tier: newRole } 
    });
}
