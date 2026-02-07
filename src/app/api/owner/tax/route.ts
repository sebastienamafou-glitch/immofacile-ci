import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ AJOUT SÉCURITÉ RÔLE
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 2. RECUPÉRATION DE L'ANNÉE
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    // On force les dates en UTC pour éviter les décalages horaires de fin d'année
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // 3. REQUÊTE : PROPRIÉTÉS + REVENUS REELS + DÉPENSES
    const properties = await prisma.property.findMany({
      where: { ownerId: owner.id },
      include: {
        leases: {
            include: {
                payments: {
                    where: {
                        date: { gte: startDate, lte: endDate },
                        status: 'SUCCESS',
                        type: 'LOYER' // ✅ CRITIQUE : On ne déclare pas les Cautions aux impôts !
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

    // 4. CALCULS ET AGGRÉGATION (Sans 'any')
    let totalRevenue = 0;
    let totalExpenses = 0;

    const breakdown = properties.map((prop) => {
        // A. Revenus (Somme des loyers encaissés)
        const propRevenue = prop.leases.reduce((sum, lease) => {
            const leasePayments = lease.payments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
            return sum + leasePayments;
        }, 0);

        // B. Dépenses (Somme des travaux payés)
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

    // 5. RÉPONSE JSON
    return NextResponse.json({
      success: true,
      data: {
          ownerName: owner.name,
          ownerEmail: owner.email,
          year: year,
          revenue: totalRevenue,
          expenses: totalExpenses,
          net: totalRevenue - totalExpenses, // Résultat Foncier Brut
          properties: breakdown
      }
    });

  } catch (error) {
    console.error("Erreur Tax API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
