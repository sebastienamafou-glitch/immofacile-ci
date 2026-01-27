import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : On bascule sur l'ID (Plus robuste que l'email)
    const userId = request.headers.get("x-user-id");
    
    // Double sécurité : On vérifie aussi le rôle si le middleware l'a injecté
    const userRole = request.headers.get("x-user-role");

    if (!userId || (userRole && userRole !== 'OWNER' && userRole !== 'SUPER_ADMIN')) {
        return NextResponse.json({ error: "Accès refusé. Zone Propriétaire." }, { status: 403 });
    }

    // 2. EXÉCUTION PARALLÈLE (Performance Max)
    const [owner, artisansData] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId }, // ✅ Recherche rapide par ID
            select: {
                id: true, name: true, email: true, walletBalance: true,
                
                // Patrimoine (Longue Durée)
                propertiesOwned: { 
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true, title: true, address: true, isPublished: true,
                        price: true, commune: true, images: true,
                        bedrooms: true, bathrooms: true, surface: true, type: true,
                        leases: {
                            where: { isActive: true }, 
                            select: {
                                monthlyRent: true, isActive: true,
                                tenant: { select: { name: true, phone: true, email: true } }
                            }
                        },
                        incidents: {
                            where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
                            select: { status: true }
                        }
                    }
                },

                // Akwaba (Courte Durée)
                listings: {
                    select: {
                        id: true, title: true, pricePerNight: true, isPublished: true, images: true,
                        bookings: {
                            where: { 
                                status: { in: ['PAID', 'CONFIRMED'] },
                                startDate: { gte: new Date() }
                            },
                            orderBy: { startDate: 'asc' },
                            take: 5,
                            select: {
                                id: true, startDate: true, endDate: true, status: true,
                                guest: { select: { name: true, phone: true } }
                            }
                        }
                    }
                },

                // Transactions
                transactions: {
                    take: 5, orderBy: { createdAt: 'desc' },
                    select: { id: true, amount: true, type: true, reason: true, createdAt: true }
                }
            }
        }),

        // Annuaire Artisans
        prisma.user.findMany({
            where: { role: 'ARTISAN', isActive: true },
            select: { id: true, name: true, jobTitle: true, phone: true },
            take: 5, orderBy: { name: 'asc' }
        })
    ]);

    if (!owner) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    // 3. CALCULS KPIs
    const myProperties = owner.propertiesOwned || [];
    const myListings = owner.listings || [];

    // Revenus
    const monthlyIncome = myProperties.reduce((total, p) => {
        return total + p.leases.reduce((sum, l) => sum + l.monthlyRent, 0);
    }, 0);

    // Taux d'Occupation
    const occupiedCount = myProperties.filter(p => p.leases.length > 0).length;
    const occupancyRate = myProperties.length > 0 
        ? Math.round((occupiedCount / myProperties.length) * 100) 
        : 0;

    // Incidents
    const activeIncidentsCount = myProperties.reduce((sum, p) => sum + p.incidents.length, 0);

    // 4. RÉPONSE JSON OPTIMISÉE
    return NextResponse.json({
      success: true,
      user: { name: owner.name, walletBalance: owner.walletBalance },
      stats: {
        totalProperties: myProperties.length + myListings.length,
        occupancyRate,
        monthlyIncome,
        activeIncidentsCount,
      },
      // Ajout du flag isAvailable pour le Frontend
      properties: myProperties.map(p => ({ ...p, isAvailable: p.leases.length === 0 })),
      listings: myListings,
      // Aplatir les réservations
      bookings: myListings.flatMap(l => l.bookings.map(b => ({ ...b, listing: { title: l.title } }))),
      artisans: artisansData.map(a => ({ 
          id: a.id, name: a.name, phone: a.phone, 
          job: a.jobTitle || 'Expert'
      }))
    });

  } catch (error) {
    console.error("🔥 CRASH API DASHBOARD:", error);
    return NextResponse.json({ error: "Erreur interne système" }, { status: 500 });
  }
}
