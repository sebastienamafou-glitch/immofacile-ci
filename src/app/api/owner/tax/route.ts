import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    // 2. RECUPÉRATION DE L'ANNÉE
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    // 3. REQUÊTE : PROPRIÉTÉS + REVENUS + DÉPENSES (Incidents)
    const properties = await prisma.property.findMany({
      where: { ownerId: owner.id },
      include: {
        leases: {
            include: {
                payments: {
                    where: {
                        date: { gte: startDate, lte: endDate },
                        status: 'SUCCESS' // Uniquement les paiements validés
                    }
                }
            }
        },
        incidents: {
            where: {
                updatedAt: { gte: startDate, lte: endDate },
                finalCost: { not: null, gt: 0 } // Uniquement les travaux payants
            }
        }
      }
    });

    // 4. CALCULS ET AGGRÉGATION
    let totalRevenue = 0;
    let totalExpenses = 0;

    const breakdown = properties.map((prop: any) => {
        // A. Revenus (Somme des paiements de tous les baux de la propriété)
        const propRevenue = prop.leases.reduce((sum: number, lease: any) => {
            const leasePayments = lease.payments.reduce((pSum: number, p: any) => pSum + (p.amount || 0), 0);
            return sum + leasePayments;
        }, 0);

        // B. Dépenses (Somme des incidents/travaux liés à la propriété)
        const propExpenses = prop.incidents.reduce((sum: number, inc: any) => {
            return sum + (inc.finalCost || 0);
        }, 0);
        
        totalRevenue += propRevenue;
        totalExpenses += propExpenses;

        return {
            title: prop.title,
            commune: prop.commune,
            rev: propRevenue,
            exp: propExpenses,
            net: propRevenue - propExpenses
        };
    });

    // 5. RÉPONSE JSON
    return NextResponse.json({
      success: true,
      data: {
          ownerName: owner.name,
          ownerEmail: owner.email,
          year: year,
          revenue: totalRevenue,
          expenses: totalExpenses,
          net: totalRevenue - totalExpenses,
          properties: breakdown
      }
    });

  } catch (error) {
    console.error("Erreur Tax API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
