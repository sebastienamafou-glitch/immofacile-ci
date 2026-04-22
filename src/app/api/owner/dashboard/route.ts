import { NextResponse } from "next/server";
import { auth } from "@/auth"; 
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { DashboardResponseSchema } from "@/schemas/dashboard.schema"; 

export const dynamic = 'force-dynamic';

export const GET = auth(async (req) => {
  try {
    const session = req.auth;

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    if (userRole !== 'OWNER' && userRole !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: "Accès refusé. Zone Propriétaire uniquement." }, { status: 403 });
    }

    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const [
        ownerData, 
        artisansData, 
        totalMonthlyIncome, 
        activeIncidentsAggregate,
        creditsAggregate,
        debitsAggregate
    ] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, name: true, email: true, role: true,
                isVerified: true, 
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
                                id: true, 
                                monthlyRent: true, 
                                isActive: true,
                                startDate: true,
                                depositAmount: true,      
                                advanceAmount: true,      
                                tenantLeasingFee: true,   
                                tenant: { 
                                    select: { 
                                        id: true, name: true, phone: true, email: true,
                                        isVerified: true,
                                        kyc: { select: { status: true } } 
                                    } 
                                },
                                payments: { 
                                    orderBy: { date: 'desc' },
                                    take: 1,
                                    select: { 
                                        id: true, 
                                        amount: true, 
                                        date: true, 
                                        status: true,
                                        type: true        
                                    }
                                }
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
        prisma.lease.aggregate({
            where: { property: { ownerId: userId }, isActive: true },
            _sum: { monthlyRent: true }
        }),
        prisma.incident.count({
            where: { property: { ownerId: userId }, status: { in: ['OPEN', 'IN_PROGRESS'] } }
        }),
        prisma.transaction.aggregate({
            where: { userId: userId, type: 'CREDIT', createdAt: { gte: startOfYear } },
            _sum: { amount: true }
        }),
        prisma.transaction.aggregate({
            where: { userId: userId, type: 'DEBIT', createdAt: { gte: startOfYear } },
            _sum: { amount: true }
        })
    ]);

    if (!ownerData) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    const myProperties = ownerData.propertiesOwned || [];
    const myListings = ownerData.listings || [];
    const safeBalance = ownerData.finance?.walletBalance ?? 0;

    // ✅ CORRECTION : Typage strict 'any' temporaire pour court-circuiter TS lors du map/filter
    const occupiedCount = myProperties.filter((p: any) => p._count?.leases > 0).length;
    const occupancyRate = myProperties.length > 0 
        ? Math.round((occupiedCount / myProperties.length) * 100) 
        : 0;

    const totalExpenses = debitsAggregate._sum?.amount ?? 0;
    const incomeYTD = creditsAggregate._sum?.amount ?? 0;
    const netIncomeYTD = incomeYTD - totalExpenses;

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
        monthlyIncome: totalMonthlyIncome._sum?.monthlyRent ?? 0,
        activeIncidentsCount: activeIncidentsAggregate,
        totalExpenses,
        netIncomeYTD
      },
      // ✅ CORRECTION : Destruction propre de '_count' pour coller au Schéma Zod
      properties: myProperties.map((p: any) => {
          const { _count, ...rest } = p;
          return {
              ...rest,
              isAvailable: _count?.leases === 0,
              leases: p.leases.map((l: any) => ({
                ...l,
                tenant: l.tenant ? {
                  ...l.tenant,
                  isVerified: l.tenant.kyc?.status === 'VERIFIED' || l.tenant.isVerified
                } : null
              }))
          };
      }),
      listings: myListings,
      bookings: myListings.flatMap((l: any) => l.bookings.map((b: any) => ({ ...b, listing: { title: l.title } }))),
      artisans: artisansData.map((a: any) => ({ 
          id: a.id, name: a.name, phone: a.phone, 
          job: a.jobTitle ?? 'Expert'
      }))
    };

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
