import { NextResponse } from "next/server";
import { auth } from "@/auth"; 
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { DashboardResponseSchema } from "@/schemas/dashboard.schema"; // Assure-toi que le chemin correspond à ton architecture

export const dynamic = 'force-dynamic';

export const GET = auth(async (req) => {
  try {
    const session = req.auth;

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Vérification stricte du rôle
    if (userRole !== 'OWNER' && userRole !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: "Accès refusé. Zone Propriétaire uniquement." }, { status: 403 });
    }

    // EXÉCUTION PARALLÈLE : Requêtes de données UI + Agrégations SQL
    const [
        ownerData, 
        artisansData, 
        totalMonthlyIncome, 
        activeIncidentsAggregate
    ] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, name: true, email: true, role: true,
                isVerified: true, // Exposition pour le bloc KYC Front-end
                finance: { select: { walletBalance: true } },
                propertiesOwned: { 
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true, title: true, address: true, isPublished: true,
                        price: true, commune: true, images: true,
                        bedrooms: true, bathrooms: true, surface: true, type: true,
                        _count: {
                            select: { leases: { where: { isActive: true } } }
                        },
                        leases: {
                            where: { isActive: true }, 
                            select: {
                                monthlyRent: true, isActive: true,
                                tenant: { select: { name: true, phone: true, email: true } }
                            }
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
                }
            }
        }),
        prisma.user.findMany({
            where: { role: 'ARTISAN', isActive: true },
            select: { id: true, name: true, jobTitle: true, phone: true },
            take: 5, orderBy: { name: 'asc' }
        }),
        // Agrégation déportée au SGBD : Calcul de la somme des loyers actifs
        prisma.lease.aggregate({
            where: { 
                property: { ownerId: userId },
                isActive: true 
            },
            _sum: { monthlyRent: true }
        }),
        // Agrégation déportée au SGBD : Comptage des incidents en cours
        prisma.incident.count({
            where: {
                property: { ownerId: userId },
                status: { in: ['OPEN', 'IN_PROGRESS'] }
            }
        })
    ]);

    if (!ownerData) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    // TRAITEMENT KPIs
    const myProperties = ownerData.propertiesOwned || [];
    const myListings = ownerData.listings || [];
    const safeBalance = ownerData.finance?.walletBalance ?? 0;

    const occupiedCount = myProperties.filter(p => p._count.leases > 0).length;
    const occupancyRate = myProperties.length > 0 
        ? Math.round((occupiedCount / myProperties.length) * 100) 
        : 0;

    // CONSTRUCTION DU PAYLOAD STRICT
    const rawPayload = {
      success: true,
      user: { 
          id: ownerData.id,
          name: ownerData.name,
          email: ownerData.email,
          role: ownerData.role,
          walletBalance: safeBalance,
          isVerified: ownerData.isVerified ?? false
      },
      stats: {
        totalProperties: myProperties.length + myListings.length,
        occupancyRate,
        monthlyIncome: totalMonthlyIncome._sum.monthlyRent ?? 0,
        activeIncidentsCount: activeIncidentsAggregate,
      },
      // Retrait propre de l'objet métier _count avant sérialisation
      properties: myProperties.map(({ _count, ...p }) => ({ 
          ...p, 
          isAvailable: _count.leases === 0 
      })),
      listings: myListings,
      bookings: myListings.flatMap(l => l.bookings.map(b => ({ ...b, listing: { title: l.title } }))),
      artisans: artisansData.map(a => ({ 
          id: a.id, name: a.name, phone: a.phone, 
          job: a.jobTitle ?? 'Expert'
      }))
    };

    // VALIDATION ZOD
    const validatedPayload = DashboardResponseSchema.parse(rawPayload);

    return NextResponse.json(validatedPayload);

  } catch (error) {
    if (error instanceof z.ZodError) {
        console.error("[VALIDATION_ERROR]", error.format());
        return NextResponse.json({ error: "Structure de données invalide" }, { status: 500 });
    }
    
    console.error("[GET_DASHBOARD_ERROR]", error);
    return NextResponse.json({ error: "Erreur interne système" }, { status: 500 });
  }
});
