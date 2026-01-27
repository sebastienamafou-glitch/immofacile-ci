import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = request.headers.get("x-user-id");
    
    if (!userId) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

    // 2. RÉCUPÉRATION PROPRIÉTAIRE (Via ID)
    const owner = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, name: true, email: true }
    });

    if (!owner) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    // PARAMÈTRES DATE
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // REQUÊTE OPTIMISÉE
    const properties = await prisma.property.findMany({
      where: { ownerId: owner.id },
      include: {
        leases: {
            include: {
                payments: {
                    where: {
                        date: { gte: startDate, lte: endDate },
                        status: 'SUCCESS',
                        type: { not: 'DEPOSIT' } // ✅ FISCALITÉ : On exclut les cautions !
                    }
                }
            }
        },
        incidents: {
            where: {
                updatedAt: { gte: startDate, lte: endDate },
                finalCost: { not: null }
            }
        }
      }
    });

    // CALCULS
    let totalRevenue = 0;
    let totalExpenses = 0;

    const breakdown = properties.map((prop) => {
        // Revenus (Loyers + Charges)
        const propRevenue = prop.leases.reduce((sum, lease) => {
            return sum + lease.payments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
        }, 0);

        // Dépenses (Incidents / Travaux)
        const propExpenses = prop.incidents.reduce((sum, inc) => {
            return sum + (inc.finalCost || 0);
        }, 0);
        
        totalRevenue += propRevenue;
        totalExpenses += propExpenses;

        return {
            id: prop.id,
            title: prop.title,
            commune: prop.commune,
            rev: propRevenue,
            exp: propExpenses,
            net: propRevenue - propExpenses
        };
    });

    return NextResponse.json({
      success: true,
      data: {
          year,
          ownerName: owner.name,
          ownerEmail: owner.email,
          revenue: totalRevenue,
          expenses: totalExpenses,
          net: totalRevenue - totalExpenses,
          properties: breakdown
      }
    });

  } catch (error: any) {
    console.error("Erreur API Tax:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
