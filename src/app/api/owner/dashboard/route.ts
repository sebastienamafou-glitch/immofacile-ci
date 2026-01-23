import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION HYBRIDE (ImmoFacile + Akwaba)
    const owner = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        walletBalance: true,
        
        // A. LONGUE DURÉE (Properties)
        propertiesOwned: { 
          select: {
            id: true,
            title: true,
            address: true,
            isPublished: true,
            
            // 👇 AJOUT DES CHAMPS MANQUANTS POUR LA GRILLE 👇
            price: true,        // CORRECTION DE L'ERREUR
            commune: true,
            images: true,
            bedrooms: true,
            bathrooms: true,
            surface: true,
            type: true,
            // 👆 FIN DES AJOUTS 👆

            leases: {
              where: { isActive: true }, 
              select: {
                monthlyRent: true,
                isActive: true,
                tenant: { select: { name: true, phone: true } }
              }
            },
            incidents: {
               select: { status: true }
            }
          }
        },

        // B. COURTE DURÉE (Listings Akwaba)
        listings: {
            select: {
                id: true,
                title: true,
                pricePerNight: true,
                isPublished: true,
                images: true,
                bookings: {
                    where: { 
                        status: { in: ['PAID', 'CONFIRMED'] },
                        startDate: { gte: new Date() }
                    },
                    orderBy: { startDate: 'asc' },
                    take: 5,
                    select: {
                        id: true,
                        startDate: true,
                        endDate: true,
                        guest: { select: { name: true, phone: true } },
                        status: true
                    }
                }
            }
        },

        // C. TRANSACTIONS RÉCENTES
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

    if (!owner || owner.role !== "OWNER") {
      return NextResponse.json({ error: "Accès réservé." }, { status: 403 });
    }

    // --- 3. CALCULS UNIFIÉS (KPIs) ---

    const myProperties = owner.propertiesOwned || [];
    const myListings = owner.listings || [];

    // Calculs inchangés...
    const monthlyIncome = myProperties.reduce((total, property) => {
      const propertyRent = property.leases.reduce((sum, lease) => sum + lease.monthlyRent, 0);
      return total + propertyRent;
    }, 0);

    const occupiedCount = myProperties.filter(p => p.leases.length > 0).length;
    const occupancyRate = myProperties.length > 0 
      ? Math.round((occupiedCount / myProperties.length) * 100) 
      : 0;

    const activeIncidentsCount = myProperties.reduce((total, property) => {
        return total + property.incidents.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status)).length;
    }, 0);

    // --- 4. FORMATAGE POUR LE FRONTEND ---
    
    // On formate les propriétés pour ajouter 'isAvailable' requis par PropertiesGrid
    const formattedProperties = myProperties.map(p => ({
        ...p,
        isAvailable: p.leases.length === 0
    }));

    const allUpcomingBookings = myListings.flatMap(l => 
        l.bookings.map(b => ({ ...b, listing: { title: l.title } }))
    ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return NextResponse.json({
      success: true,
      user: {
        name: owner.name,
        walletBalance: owner.walletBalance,
      },
      stats: {
        totalProperties: myProperties.length + myListings.length,
        occupancyRate,
        monthlyIncome,
        activeIncidentsCount,
      },
      properties: formattedProperties, // ✅ On envoie la version formatée avec isAvailable
      listings: myListings,
      bookings: allUpcomingBookings,
      artisans: []
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
