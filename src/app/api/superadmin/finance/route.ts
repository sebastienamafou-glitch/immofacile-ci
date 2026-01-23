import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ RÔLE STRICT ADMIN
    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    // 2. STATS GLOBALES (Uniquement les paiements RÉUSSIS)
    const stats = await prisma.payment.aggregate({
        where: {
            status: 'SUCCESS' // ✅ CRITIQUE : On ne compte que l'argent réellement encaissé
        },
        _sum: {
            amount: true,          // Volume total brassé
            amountPlatform: true,  // Notre Com
            amountOwner: true,     // Reversé aux proprios
        },
        _count: {
            id: true 
        }
    });

    // 3. HISTORIQUE DÉTAILLÉ
    const rawHistory = await prisma.payment.findMany({
        orderBy: { date: 'desc' }, 
        take: 50,
        include: {
            lease: {
                select: {
                    property: { select: { title: true } },
                    tenant: { select: { name: true } }
                }
            }
        }
    });

    // 4. FORMATAGE (Pour un tableau propre en front)
    const formattedHistory = rawHistory.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        commission: payment.amountPlatform, // Ce que la plateforme gagne
        status: payment.status,
        date: payment.date,
        type: payment.type, // LOYER, DEPOT, etc.
        details: payment.lease 
            ? `${payment.lease.tenant.name} (${payment.lease.property.title})`
            : "Paiement orphelin"
    }));
    
    return NextResponse.json({
      success: true,
      stats: {
          volume: stats._sum.amount || 0,
          totalRevenue: stats._sum.amountPlatform || 0, 
          transactionCount: stats._count.id
      },
      history: formattedHistory
    });

  } catch (error) {
    console.error("Erreur Admin Finance:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
