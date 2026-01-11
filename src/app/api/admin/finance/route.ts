import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // 2. STATS GLOBALES
    const stats = await prisma.payment.aggregate({
        _sum: {
            amount: true,          
            amountPlatform: true,  
            amountOwner: true,     
        },
        _count: {
            id: true 
        }
    });

    // 3. HISTORIQUE DÉTAILLÉ (Correction ICI)
    const history = await prisma.payment.findMany({
        // ✅ CORRECTION : On trie par 'date' car 'createdAt' n'existe pas sur Payment
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
    
    return NextResponse.json({
      success: true,
      stats: {
          volume: stats._sum.amount || 0,
          totalRevenue: stats._sum.amountPlatform || 0, 
          transactionCount: stats._count.id
      },
      history
    });

  } catch (error) {
    console.error("Erreur Admin Finance:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
