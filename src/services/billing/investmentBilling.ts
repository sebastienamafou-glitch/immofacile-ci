import { 
    Prisma, 
    InvestmentContract, 
    Role, 
    TransactionType, 
    BalanceType,
    InvestmentStatus // ✅ IMPORT DE L'ENUMÉRATION
} from "@prisma/client";
import { logActivity } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { TxClient } from "@/services/billing/types"; // ✅ Typage unifié (DRY)

// =============================================================================
// 🚀 MOTEUR DE TRAITEMENT (CROWDFUNDING & INVESTISSEMENT)
// =============================================================================
export async function processInvestmentPayment(
    tx: TxClient, 
    investmentContract: InvestmentContract, 
    isValidPayment: boolean, 
    amountPaid: number, 
    transactionId: string
) {
    // ✅ CORRECTION ENUMÉRATION : Utilisation de InvestmentStatus.ACTIVE
    if (investmentContract.status === InvestmentStatus.ACTIVE || investmentContract.status === InvestmentStatus.COMPLETED) return;

    if (!isValidPayment) {
        await tx.investmentContract.update({ 
            where: { id: investmentContract.id }, 
            data: { status: InvestmentStatus.CANCELLED } // 👈 CORRECTION
        });
        return;
    }

    if (amountPaid !== investmentContract.amount) {
        console.error(`🚨 [Alerte Fraude] Investissement ${investmentContract.id} : attendu ${investmentContract.amount}, reçu ${amountPaid}`);
        await tx.investmentContract.update({ 
            where: { id: investmentContract.id }, 
            data: { status: InvestmentStatus.CANCELLED } // 👈 CORRECTION
        });
        return;
    }

    await tx.investmentContract.update({ 
        where: { id: investmentContract.id }, 
        data: { status: InvestmentStatus.ACTIVE } // 👈 CORRECTION
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

    // Validation comptable : Encaissement des fonds sur le compte Plateforme (Requête hors verrou)
    const superAdmin = await prisma.user.findFirst({ 
        where: { role: Role.SUPER_ADMIN }, 
        select: { id: true } 
    });

    if (superAdmin) {
        // ✅ CORRECTION ARCHITECTURE : Ciblage de UserFinance
        await tx.userFinance.update({
            where: { userId: superAdmin.id },
            data: { walletBalance: { increment: amountPaid } }
        });
        
        await tx.transaction.create({
            data: {
                amount: amountPaid,
                type: TransactionType.CREDIT,
                status: 'SUCCESS',
                reason: `Investissement Crowdfunding - Contrat #${investmentContract.id}`,
                userId: superAdmin.id,
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
