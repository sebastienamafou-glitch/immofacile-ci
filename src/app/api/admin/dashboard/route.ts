import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

// =====================================================================
// 1. DÉFINITION DES TYPES
// =====================================================================

// A. Type pour les Transactions
const getTransactionsQuery = () => prisma.transaction.findMany({
  take: 10,
  orderBy: { createdAt: 'desc' },
  include: { user: { select: { name: true, role: true } } }
});
type TransactionWithUser = Awaited<ReturnType<typeof getTransactionsQuery>>[number];

// B. Type pour les KYC
const getKycsQuery = () => prisma.user.findMany({
  where: { kycStatus: "PENDING" },
  select: { 
      id: true, 
      name: true, 
      role: true, 
      kycDocuments: true // ✅ CORRECT : C'est le tableau défini dans schema.prisma
      // ❌ SUPPRIMÉ : kycDocumentUrl (n'existe pas)
  }
});
type KycUser = Awaited<ReturnType<typeof getKycsQuery>>[number];

// =====================================================================
// 2. FONCTION PRINCIPALE
// =====================================================================
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ AUTH & RÔLE
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // 2. RÉCUPÉRATION DES DONNÉES (Parallélisé pour la vitesse)
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
      getKycsQuery(),
      getTransactionsQuery(),
      prisma.user.findMany({
        where: { role: "OWNER" },
        select: { id: true, name: true, email: true, walletBalance: true },
        take: 20
      }),
      prisma.payment.aggregate({ _sum: { amountPlatform: true } }) // Revenu net ImmoFacile
    ]);

    // =====================================================================
    // 3. MAPPING & FORMATAGE
    // =====================================================================

    const formattedKycs = pendingKycsRaw.map((user: KycUser) => ({
        id: user.id,
        name: user.name || "Utilisateur sans nom",
        role: user.role,
        // ✅ LOGIQUE : On prend le premier document du tableau comme aperçu
        kycDocumentUrl: user.kycDocuments.length > 0 ? user.kycDocuments[0] : null
    }));

    const formattedActivities = recentTransactions.map((tx: TransactionWithUser) => ({
        id: tx.id,
        action: `${tx.type === 'CREDIT' ? '🟢' : '🔴'} ${tx.reason}`,
        amount: tx.amount,
        createdAt: tx.createdAt,
        user: tx.user ? `${tx.user.name} (${tx.user.role})` : "Système"
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
