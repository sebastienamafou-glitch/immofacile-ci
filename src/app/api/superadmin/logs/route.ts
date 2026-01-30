import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// 1. REQUÊTE TYPÉE
const getAdminLogsQuery = () => prisma.transaction.findMany({
  take: 100,
  orderBy: { createdAt: 'desc' },
  include: { 
    user: { 
        select: { name: true, role: true, email: true } 
    } 
  }
});

type TransactionLog = Awaited<ReturnType<typeof getAdminLogsQuery>>[number];

// 2. UTILITAIRE CATÉGORIE
function determineCategory(type: string) {
    if (['CREDIT', 'DEBIT', 'PAYMENT', 'CASHOUT_WAVE', 'CASHOUT_ORANGE'].includes(type)) return 'FINANCE';
    if (['LOGIN', 'AUTH', 'KYC_VERIFIED'].includes(type)) return 'AUTH';
    if (['ADMIN_CREDIT', 'AGENCY_CREATE'].includes(type)) return 'SECURITY';
    return 'SYSTEM';
}

export async function GET(request: Request) {
  try {
    // 3. SÉCURITÉ ZERO TRUST (ID)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true }
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès Interdit" }, { status: 403 });
    }

    // 4. RÉCUPÉRATION
    const rawTransactions = await getAdminLogsQuery();

    // 5. MAPPING
    const logs = rawTransactions.map((tx: TransactionLog) => ({
        id: tx.id,
        createdAt: tx.createdAt,
        category: determineCategory(tx.type),
        user: tx.user,
        action: tx.reason,
        details: { 
            amount: tx.amount, 
            type: tx.type 
        }
    }));

    return NextResponse.json({ success: true, logs });

  } catch (error) {
    console.error("Erreur Admin Logs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
