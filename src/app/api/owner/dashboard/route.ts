import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userEmail = req.headers.get("x-user-email");

    if (!userEmail) {
      return NextResponse.json({ success: false, error: "Non autorisé." }, { status: 401 });
    }

    const owner = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        walletBalance: true,
        
        propertiesOwned: { 
          include: {
            leases: {
              where: { isActive: true }, // On ne prend que les baux actifs
              select: {
                monthlyRent: true,
                isActive: true,
                status: true,
                startDate: true, // Pour la date de signature
                // ✅ AJOUTER CECI :
                tenant: {
                  select: { name: true }
                }
              }
            },
            incidents: {
               select: { status: true }
            }
          }
        },

        // ✅ CORRECTION 2 : Champs conformes au modèle Transaction (pas de status ni date)
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            type: true,
            reason: true,     // Remplace 'status' qui n'existe pas
            createdAt: true   // Remplace 'date' qui n'existe pas
          }
        }
      }
    });

    if (!owner) {
      return NextResponse.json({ success: false, error: "Compte introuvable." }, { status: 404 });
    }

    // --- LOGIQUE MÉTIER ---

    const myProperties = owner.propertiesOwned || []; 
    const totalProperties = myProperties.length;

    // Calculs financiers & occupation
    const monthlyIncome = myProperties.reduce((total: number, property: any) => {
      const activeLease = property.leases?.find(
        (lease: any) => lease.isActive === true && lease.status === 'ACTIVE'
      );
      return total + (activeLease?.monthlyRent || 0);
    }, 0);

    const occupiedCount = myProperties.filter((property: any) =>
      property.leases?.some((lease: any) => lease.isActive === true && lease.status === 'ACTIVE')
    ).length;

    const occupancyRate = totalProperties > 0 
      ? Math.round((occupiedCount / totalProperties) * 100) 
      : 0;

    const activeIncidentsCount = myProperties.reduce((total: number, property: any) => {
        const activePropIncidents = property.incidents?.filter(
            (i: any) => ['OPEN', 'IN_PROGRESS', 'QUOTATION'].includes(i.status)
        ).length || 0;
        return total + activePropIncidents;
    }, 0);

    // ✅ MAPPING DES TRANSACTIONS : On transforme les données brutes pour le Frontend
    const formattedTransactions = (owner.transactions || []).map((t: any) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        // On simule un status 'COMPLETED' car toutes les transactions en base sont valides
        status: 'COMPLETED', 
        // On mappe createdAt vers date pour l'affichage
        date: t.createdAt,   
        reason: t.reason
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
        walletBalance: owner.walletBalance || 0,
      },
      stats: {
        totalProperties,
        occupancyRate,
        monthlyIncome,
        activeIncidentsCount,
        walletBalance: owner.walletBalance || 0
      },
      properties: myProperties.map((p: any) => ({
        ...p,
        isRented: p.leases?.some((l: any) => l.isActive && l.status === 'ACTIVE')
      })),
      recentTransactions: formattedTransactions, // On envoie la version corrigée
      artisans: [] 
    });

  } catch (error) {
    console.error("🔥 Erreur Dashboard:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur." }, { status: 500 });
  }
}
