import { NextResponse } from "next/server";
import { auth } from "@/auth"; 
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ✅ BONNE PRATIQUE : On enveloppe la route API avec `auth` pour l'injection native de session
export const GET = auth(async (req) => {
  try {
    const session = req.auth;

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role; // Plus besoin de @ts-ignore !

    // Vérification stricte du rôle
    if (userRole !== 'OWNER' && userRole !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: "Accès refusé. Zone Propriétaire uniquement." }, { status: 403 });
    }

    // EXÉCUTION PARALLÈLE
    const [owner, artisansData] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, 
                name: true, 
                email: true, 
                role: true, // ✅ Nécessaire pour l'UI front-end
                finance: {
                    select: { walletBalance: true }
                },
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
                transactions: {
                    take: 5, orderBy: { createdAt: 'desc' },
                    select: { id: true, amount: true, type: true, reason: true, createdAt: true }
                }
            }
        }),
        prisma.user.findMany({
            where: { role: 'ARTISAN', isActive: true },
            select: { id: true, name: true, jobTitle: true, phone: true },
            take: 5, orderBy: { name: 'asc' }
        })
    ]);

    if (!owner) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    // CALCULS KPIs
    const myProperties = owner.propertiesOwned || [];
    const myListings = owner.listings || [];
    const safeBalance = owner.finance?.walletBalance ?? 0;

    const monthlyIncome = myProperties.reduce((total, p) => {
        return total + p.leases.reduce((sum, l) => sum + l.monthlyRent, 0);
    }, 0);

    const occupiedCount = myProperties.filter(p => p.leases.length > 0).length;
    const occupancyRate = myProperties.length > 0 
        ? Math.round((occupiedCount / myProperties.length) * 100) 
        : 0;

    const activeIncidentsCount = myProperties.reduce((sum, p) => sum + p.incidents.length, 0);

    // RÉPONSE JSON
    return NextResponse.json({
      success: true,
      // ✅ CORRECTION : Objet user complet pour éviter les plantages React
      user: { 
          id: owner.id,
          name: owner.name,
          email: owner.email,
          role: owner.role,
          walletBalance: safeBalance 
      },
      stats: {
        totalProperties: myProperties.length + myListings.length,
        occupancyRate,
        monthlyIncome,
        activeIncidentsCount,
      },
      properties: myProperties.map(p => ({ ...p, isAvailable: p.leases.length === 0 })),
      listings: myListings,
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
});
