import { 
    Prisma, 
    InvestmentContract, 
    Role, 
    TransactionType, 
    BalanceType 
} from "@prisma/client";
import { logActivity } from "@/lib/logger";
import { prisma } from "@/lib/prisma"; // ✅ Instance globale importée

// =============================================================================
// 🛡️ TYPAGE STRICT (Isolé pour éviter les dépendances circulaires)
// =============================================================================
export type TxClient = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

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
    if (investmentContract.status === "ACTIVE" || investmentContract.status === "SUCCESS") return;

    if (!isValidPayment) {
        await tx.investmentContract.update({ 
            where: { id: investmentContract.id }, 
            data: { status: "FAILED" } 
        });
        return;
    }

    if (amountPaid !== investmentContract.amount) {
        console.error(`🚨 [Alerte Fraude] Investissement ${investmentContract.id} : attendu ${investmentContract.amount}, reçu ${amountPaid}`);
        await tx.investmentContract.update({ 
            where: { id: investmentContract.id }, 
            data: { status: "FAILED" } 
        });
        return;
    }

    await tx.investmentContract.update({ 
        where: { id: investmentContract.id }, 
        data: { status: "SUCCESS" } 
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
        await tx.user.update({
            where: { id: superAdmin.id },
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
