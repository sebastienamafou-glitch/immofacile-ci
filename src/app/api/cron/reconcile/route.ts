import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/logger";

const CRON_SECRET = process.env.CRON_SECRET 

export const dynamic = 'force-dynamic';
export const maxDuration = 300; 

export async function GET(request: Request) {
  // 1. VÉRIFICATION D'SÉCURITÉ
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const report = { processedUsers: 0, anomalies: 0, details: [] as string[] };

  try {
    // 2. AGRÉGATION GLOBALE DES TRANSACTIONS (OPTIMISÉE)
    // On récupère les sommes groupées par utilisateur, type de balance et type de transaction en un seul appel DB
    const allSums = await prisma.transaction.groupBy({
      by: ['userId', 'balanceType', 'type'],
      where: { status: 'SUCCESS' },
      _sum: { amount: true }
    });

    // 3. CALCUL DES SOLDES THÉORIQUES EN MÉMOIRE
    const theoretical: Record<string, { WALLET: number; ESCROW: number; REFERRAL: number }> = {}; 

    allSums.forEach(s => {
      if (!theoretical[s.userId]) {
        theoretical[s.userId] = { WALLET: 0, ESCROW: 0, REFERRAL: 0 };
      }
      
      const amount = s._sum.amount || 0;
      // Logique métier : CREDIT/REFUND augmente le solde, DEBIT/PAYMENT/INVESTMENT le diminue
      const isPositive = ['CREDIT', 'REFUND'].includes(s.type);
      const change = isPositive ? amount : -amount;

      theoretical[s.userId][s.balanceType as keyof typeof theoretical[string]] += change;
    });

    // 4. COMPARAISON AVEC LA TABLE USERFINANCE
    const finances = await prisma.userFinance.findMany({
      include: { user: { select: { email: true, name: true } } }
    });

    report.processedUsers = finances.length;

    for (const f of finances) {
      const t = theoretical[f.userId] || { WALLET: 0, ESCROW: 0, REFERRAL: 0 };
      
      // Vérification des 3 balances définies dans le schéma 
      const hasWalletMismatch = f.walletBalance !== t.WALLET;
      const hasEscrowMismatch = f.escrowBalance !== t.ESCROW;
      const hasReferralMismatch = f.referralBalance !== t.REFERRAL;

      if (hasWalletMismatch || hasEscrowMismatch || hasReferralMismatch) {
        report.anomalies++;
        
        const gap = (f.walletBalance - t.WALLET) + (f.escrowBalance - t.ESCROW);
        const errorMsg = `🚨 ECART: ${f.user.email} | Wallet: ${f.walletBalance} vs ${t.WALLET} | Escrow: ${f.escrowBalance} vs ${t.ESCROW}`;
        report.details.push(errorMsg);
        console.error(errorMsg);

        // 5. ALERTE ROUGE (Notification Super Admins)
        const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
        for (const admin of superAdmins) {
          await sendNotification({
            userId: admin.id,
            title: "🚨 INCOHÉRENCE FINANCIÈRE",
            message: `Alerte sur le compte de ${f.user.name}. Écart détecté entre les transactions et le solde Wallet/Escrow.`,
            type: "ERROR",
            link: `/dashboard/superadmin/users/${f.userId}`
          });
        }

        // 6. LOG D'AUDIT SÉCURISÉ
        await logActivity({
          action: "SECURITY_ALERT",
          entityId: f.userId,
          entityType: "FINANCE",
          userId: "SYSTEM_CRON",
          metadata: {
            walletGap: f.walletBalance - t.WALLET,
            escrowGap: f.escrowBalance - t.ESCROW,
            referralGap: f.referralBalance - t.REFERRAL,
            reason: "Batch Reconciliation Mismatch"
          }
        });
      }
    }

    // 7. RÉPONSE FINALE
    if (report.anomalies === 0) {
      return NextResponse.json({ success: true, message: "Réconciliation terminée : 0 anomalies.", stats: report });
    } else {
      return NextResponse.json({ success: false, message: "Anomalies financières détectées !", stats: report }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Erreur Fatale Cron:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
