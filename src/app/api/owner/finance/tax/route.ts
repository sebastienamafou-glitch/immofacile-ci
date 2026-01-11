import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 

// Force le mode dynamique pour ne pas mettre en cache les données financières
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : On fait confiance au Middleware qui a déjà validé le token
    const userEmail = request.headers.get("x-user-email");
    
    if (!userEmail) {
        return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const owner = await prisma.user.findUnique({ 
        where: { email: userEmail } 
    });

    if (!owner) {
        return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
    }

    // 2. PARAMÈTRES DE DATE
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // 3. REQUÊTE OPTIMISÉE
    const properties = await prisma.property.findMany({
      where: { ownerId: owner.id },
      include: {
        leases: {
            include: {
                payments: {
                    where: {
                        date: { gte: startDate, lte: endDate },
                        status: 'SUCCESS'
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

    // 4. AGRÉGATION DES DONNÉES
    let totalRevenue = 0;
    let totalExpenses = 0;

    const breakdown = properties.map((prop: any) => {
        // Revenus
        const propRevenue = prop.leases.reduce((sum: number, lease: any) => {
            return sum + lease.payments.reduce((pSum: number, p: any) => pSum + (p.amount || 0), 0);
        }, 0);

        // Dépenses
        const propExpenses = prop.incidents.reduce((sum: number, inc: any) => {
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
          revenue: totalRevenue,
          expenses: totalExpenses,
          net: totalRevenue - totalExpenses,
          properties: breakdown
      }
    });

  } catch (error: any) {
    console.error("Erreur API Tax:", error);
    return NextResponse.json(
        { error: "Erreur serveur", details: error.message }, 
        { status: 500 }
    );
  }
}
