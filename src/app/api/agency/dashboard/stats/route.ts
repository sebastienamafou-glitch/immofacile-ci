import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. VÉRIFICATION RÔLE & AGENCE (Via ID)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, agencyId: true } // Optimisation select
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

    // 3. CALCULS FINANCIERS PARALLÉLISÉS
    const [
        akwabaRevenue,
        akwabaRevenueLast,
        longTermRevenue,
        longTermRevenueLast,
        totalProperties,
        totalListings,
        occupiedProperties,
        agents
    ] = await Promise.all([
        // A. Akwaba (Court séjour)
        prisma.bookingPayment.aggregate({
            _sum: { agencyCommission: true },
            where: {
                booking: { listing: { agencyId } },
                status: 'SUCCESS',
                createdAt: { gte: currentMonthStart, lte: currentMonthEnd }
            }
        }),
        prisma.bookingPayment.aggregate({
            _sum: { agencyCommission: true },
            where: {
                booking: { listing: { agencyId } },
                status: 'SUCCESS',
                createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
            }
        }),
        // B. Longue Durée
        prisma.payment.aggregate({
            _sum: { amountAgency: true }, // ✅ CORRECTION: On prend la part AGENCE, pas Agent
            where: {
                lease: { property: { agencyId } },
                status: 'SUCCESS',
                date: { gte: currentMonthStart, lte: currentMonthEnd }
            }
        }),
        prisma.payment.aggregate({
            _sum: { amountAgency: true },
            where: {
                lease: { property: { agencyId } },
                status: 'SUCCESS',
                date: { gte: lastMonthStart, lte: lastMonthEnd }
            }
        }),
        // C. KPI Assets
        prisma.property.count({ where: { agencyId } }),
        prisma.listing.count({ where: { agencyId } }),
        prisma.property.count({ where: { agencyId, leases: { some: { isActive: true } } } }),
        // D. Top Agents
        prisma.user.findMany({
            where: { agencyId, role: 'AGENT' },
            select: {
                id: true, name: true, image: true,
                _count: { select: { missionsAccepted: { where: { status: 'COMPLETED' } } } }
            },
            orderBy: { missionsAccepted: { _count: 'desc' } },
            take: 5
        })
    ]);

    // 4. AGRÉGATION & FORMATAGE
    const currentTotal = (akwabaRevenue._sum.agencyCommission || 0) + (longTermRevenue._sum.amountAgency || 0);
    const lastTotal = (akwabaRevenueLast._sum.agencyCommission || 0) + (longTermRevenueLast._sum.amountAgency || 0);
    
    let growthPercent = 0;
    if (lastTotal > 0) {
        growthPercent = Math.round(((currentTotal - lastTotal) / lastTotal) * 100);
    } else if (currentTotal > 0) {
        growthPercent = 100;
    }

    const totalAssets = totalProperties + totalListings;
    const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

    const formattedAgents = agents.map(a => ({
        id: a.id,
        name: a.name,
        image: a.image,
        sales: a._count.missionsAccepted,
        completedMissions: a._count.missionsAccepted,
        // Estimation revenue agent (Ex: 15k par mission)
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
