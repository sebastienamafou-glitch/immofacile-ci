import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// =====================================================================
// 1. DÉFINITION DES TYPES (Inférence Native TypeScript - Infaillible)
// =====================================================================

// A. Type pour les Transactions
const getTransactionsQuery = () => prisma.transaction.findMany({
  take: 10,
  orderBy: { createdAt: 'desc' },
  include: { user: { select: { name: true } } }
});
type TransactionWithUser = Awaited<ReturnType<typeof getTransactionsQuery>>[number];

// B. Type pour les KYC (C'est ce qui manquait !)
const getKycsQuery = () => prisma.user.findMany({
  where: { kycStatus: "PENDING", kycDocuments: { isEmpty: false } },
  select: { id: true, name: true, role: true, kycDocuments: true }
});
type KycUser = Awaited<ReturnType<typeof getKycsQuery>>[number];


// =====================================================================
// 2. FONCTION PRINCIPALE
// =====================================================================
export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    const [
      totalUsers,
      totalProperties,
      activeIncidentsCount,
      pendingKycsRaw, 
      recentTransactions,
      owners,
      platformRevenue
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.incident.count({ where: { status: "OPEN" } }),
      
      // La requête réelle (identique à la Query B plus haut)
      getKycsQuery(),
      
      // La requête réelle (identique à la Query A plus haut)
      getTransactionsQuery(),
      
      prisma.user.findMany({
        where: { role: "OWNER" },
        select: { id: true, name: true, email: true, walletBalance: true },
        take: 20
      }),
      
      prisma.payment.aggregate({ _sum: { amountPlatform: true } })
    ]);

    // =====================================================================
    // 3. MAPPING STRICT (Plus aucune erreur 'implicitly any')
    // =====================================================================

    // ✅ On applique le type 'KycUser' explicitement ici
    const formattedKycs = pendingKycsRaw.map((user: KycUser) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        kycDocumentUrl: user.kycDocuments.length > 0 ? user.kycDocuments[0] : null
    }));

    // ✅ On applique le type 'TransactionWithUser' explicitement ici
    const formattedActivities = recentTransactions.map((tx: TransactionWithUser) => ({
        id: tx.id,
        action: `${tx.type} : ${tx.reason} (${tx.amount} F)`,
        createdAt: tx.createdAt,
        user: tx.user
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalProperties,
        activeIncidentsCount,
        pendingKycCount: formattedKycs.length,
        myRevenue: platformRevenue._sum.amountPlatform || 0 
      },
      lists: {
        pendingKycs: formattedKycs,     
        recentActivities: formattedActivities, 
        owners
      }
    });

  } catch (error) {
    console.error("Erreur Admin Dashboard:", error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}
