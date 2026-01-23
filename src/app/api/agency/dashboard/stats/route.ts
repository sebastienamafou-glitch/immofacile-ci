import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { agency: true }
    });

    if (!user || !user.agencyId || (user.role !== 'AGENCY_ADMIN' && user.role !== 'SUPER_ADMIN')) {
        return NextResponse.json({ error: "Accès réservé aux administrateurs d'agence." }, { status: 403 });
    }

    const agencyId = user.agencyId;
    const now = new Date();
    
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // 2. FINANCE (CA GLOBAL)
    // A. Akwaba
    const akwabaRevenue = await prisma.bookingPayment.aggregate({
        _sum: { agencyCommission: true },
        where: {
            booking: { listing: { agencyId } },
            status: 'SUCCESS',
            createdAt: { gte: currentMonthStart, lte: currentMonthEnd }
        }
    });

    const akwabaRevenueLastMonth = await prisma.bookingPayment.aggregate({
        _sum: { agencyCommission: true },
        where: {
            booking: { listing: { agencyId } },
            status: 'SUCCESS',
            createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
        }
    });

    // B. Longue Durée
    const longTermRevenue = await prisma.payment.aggregate({
        _sum: { amountAgent: true },
        where: {
            lease: { property: { agencyId } },
            status: 'SUCCESS',
            date: { gte: currentMonthStart, lte: currentMonthEnd }
        }
    });

    const longTermRevenueLastMonth = await prisma.payment.aggregate({
        _sum: { amountAgent: true },
        where: {
            lease: { property: { agencyId } },
            status: 'SUCCESS',
            date: { gte: lastMonthStart, lte: lastMonthEnd }
        }
    });

    // Totaux & Croissance
    const currentTotal = (akwabaRevenue._sum.agencyCommission || 0) + (longTermRevenue._sum.amountAgent || 0);
    const lastTotal = (akwabaRevenueLastMonth._sum.agencyCommission || 0) + (longTermRevenueLastMonth._sum.amountAgent || 0);
    
    let growthPercent = 0;
    if (lastTotal > 0) {
        growthPercent = Math.round(((currentTotal - lastTotal) / lastTotal) * 100);
    } else if (currentTotal > 0) {
        growthPercent = 100;
    }

    // 3. KPI OPÉRATIONNELS
    const totalProperties = await prisma.property.count({ where: { agencyId } });
    const totalListings = await prisma.listing.count({ where: { agencyId } });
    const totalAssets = totalProperties + totalListings;

    const occupiedProperties = await prisma.property.count({
        where: { 
            agencyId, 
            leases: { some: { isActive: true } } 
        }
    });
    
    const occupancyRate = totalProperties > 0 
        ? Math.round((occupiedProperties / totalProperties) * 100) 
        : 0;

    // 4. ÉQUIPE & PERFORMANCE
    const agents = await prisma.user.findMany({
        where: { agencyId, role: 'AGENT' },
        select: {
            id: true,
            name: true,
            image: true,
            _count: {
                select: { 
                    missionsAccepted: { where: { status: 'COMPLETED' } } 
                }
            }
        },
        orderBy: {
            missionsAccepted: { _count: 'desc' }
        },
        take: 5
    });

    // Mapping propre pour le frontend
    const formattedAgents = agents.map(a => ({
        id: a.id,
        name: a.name,
        image: a.image,
        sales: a._count.missionsAccepted, // CORRECTION ICI (On utilise le nb de missions comme proxy des ventes)
        completedMissions: a._count.missionsAccepted,
        revenueDisplay: `${(a._count.missionsAccepted * 15000).toLocaleString()} F`
    }));

    return NextResponse.json({
        success: true,
        stats: {
            revenue: currentTotal,
            revenueGrowth: growthPercent,
            activeAssets: totalAssets,
            occupancyRate: occupancyRate,
            totalAgents: await prisma.user.count({ where: { agencyId, role: 'AGENT' } })
        },
        topAgents: formattedAgents
    });

  } catch (error) {
    console.error("Agency Stats Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
