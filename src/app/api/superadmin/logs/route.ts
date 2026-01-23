import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// 1. MÉTHODE D'INFÉRENCE STRICTE (Méthode Mémorisée ✅)
// On définit la requête exacte pour typer le retour automatiquement
const getAdminLogsQuery = () => prisma.transaction.findMany({
  take: 100, // On limite aux 100 dernières actions pour la performance
  orderBy: { createdAt: 'desc' },
  include: { 
    user: { 
        select: { name: true, role: true, email: true } 
    } 
  }
});

type TransactionLog = Awaited<ReturnType<typeof getAdminLogsQuery>>[number];

export async function GET(request: Request) {
  try {
    // SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // REQUÊTE
    const rawTransactions = await getAdminLogsQuery();

    // MAPPING INTELLIGENT
    // On transforme une Transaction financière en "Log d'Audit" générique
    const logs = rawTransactions.map((tx: TransactionLog) => ({
        id: tx.id,
        createdAt: tx.createdAt,
        category: determineCategory(tx.type), // Fonction utilitaire locale
        user: tx.user,
        action: tx.reason, // Ex: "Loyer Janvier"
        details: { 
            amount: tx.amount, 
            type: tx.type // CREDIT / DEBIT
        }
    }));

    return NextResponse.json({ success: true, logs });

  } catch (error) {
    console.error("Erreur Admin Logs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Petit utilitaire pour colorer les catégories
function determineCategory(type: string) {
    if (['CREDIT', 'DEBIT', 'PAYMENT'].includes(type)) return 'FINANCE';
    if (['LOGIN', 'AUTH'].includes(type)) return 'AUTH';
    return 'SYSTEM';
}
