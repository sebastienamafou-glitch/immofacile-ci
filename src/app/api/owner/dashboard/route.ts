import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Auth Headers
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION DES DONNÉES (Correction Prisma select/include)
    const owner = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        walletBalance: true,
        
        // ✅ CORRECTION : On utilise 'select' ici, pas 'include'
        propertiesOwned: { 
          select: {
            id: true,       // Obligatoire de lister les champs qu'on veut
            title: true,
            address: true,
            isPublished: true,
            // Relations imbriquées
            leases: {
              where: { isActive: true }, 
              select: {
                monthlyRent: true,
                isActive: true,
                status: true,
                startDate: true,
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

        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            type: true,
            reason: true,
            createdAt: true
          }
        }
      }
    });

    // 3. VÉRIFICATION STRICTE DU RÔLE
    if (!owner || owner.role !== "OWNER") {
      return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // --- LOGIQUE MÉTIER ---

    const myProperties = owner.propertiesOwned || []; 
    const totalProperties = myProperties.length;

    // A. Calcul Revenus Mensuels (Basé sur les baux actifs)
    const monthlyIncome = myProperties.reduce((total, property) => {
      const propertyIncome = property.leases.reduce((sum, lease) => {
          return lease.isActive ? sum + lease.monthlyRent : sum;
      }, 0);
      return total + propertyIncome;
    }, 0);

    // B. Taux d'occupation
    const occupiedCount = myProperties.filter(property =>
      property.leases.some(lease => lease.isActive)
    ).length;

    const occupancyRate = totalProperties > 0 
      ? Math.round((occupiedCount / totalProperties) * 100) 
      : 0;

    // C. Incidents Actifs
    const activeIncidentsCount = myProperties.reduce((total, property) => {
        const activePropIncidents = property.incidents.filter(
            (i) => ['OPEN', 'IN_PROGRESS', 'QUOTATION'].includes(i.status)
        ).length;
        return total + activePropIncidents;
    }, 0);

    // D. Mapping Transactions
    const formattedTransactions = owner.transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        status: 'COMPLETED',
        date: t.createdAt,
        reason: t.reason
    }));

    // E. Mapping Propriétés
    const formattedProperties = myProperties.map((p) => ({
        id: p.id,
        title: p.title,
        address: p.address,
        isPublished: p.isPublished,
        isRented: p.leases.some((l) => l.isActive)
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
      properties: formattedProperties,
      recentTransactions: formattedTransactions,
      artisans: []
    });

  } catch (error) {
    console.error("Erreur Dashboard Owner:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
