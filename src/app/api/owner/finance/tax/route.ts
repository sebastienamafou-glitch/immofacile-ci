import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userAuth = verifyToken(request);
    
    const owner = await prisma.user.findUnique({ where: { id: userAuth.id } });
    if (!owner) return NextResponse.json({ error: "Compte introuvable" }, { status: 403 });

    // 2. RECUPÉRATION DE L'ANNÉE
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // 3. REQUÊTE BASE DE DONNÉES
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

    // 4. CALCULS (CORRECTION TYPESCRIPT ICI)
    let totalRevenue = 0;
    let totalExpenses = 0;

    // On utilise ': any' ici pour simplifier la syntaxe Prisma complexe
    // et ': number' pour les accumulateurs des reduce
    const breakdown = properties.map((prop: any) => {
        
        // A. Revenus
        const propRevenue = prop.leases.reduce((sum: number, lease: any) => {
            const leasePayments = lease.payments.reduce((pSum: number, p: any) => {
                return pSum + (p.amount || 0);
            }, 0);
            return sum + leasePayments;
        }, 0);

        // B. Dépenses
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

    // 5. RÉPONSE
    return NextResponse.json({
      success: true,
      data: {
          ownerName: owner.name || "Propriétaire",
          ownerEmail: owner.email,
          year: year,
          revenue: totalRevenue,
          expenses: totalExpenses,
          net: totalRevenue - totalExpenses,
          properties: breakdown
      }
    });

  } catch (error) {
    console.error("Erreur API Tax:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
