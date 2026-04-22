import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export const GET = auth(async (req) => {
  try {
    const session = req.auth;
    const userId = session?.user?.id;
    
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true }
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé. Niveau Général requis." }, { status: 403 });
    }

    // Préparation pour le graphique dynamique des 7 derniers jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // RÉCUPÉRATION PARALLÈLE MASSIVE (O(1) Request)
    const [
      usersCount, agenciesCount, artisansAvailable,
      propertiesCount, activeBookings,
      incidentsOpen, criticalIncidents,
      platformRevenue, bookingRevenue,
      grossRentVolume, grossBookingVolume,
      failedPaymentsCount,
      kycPendingUsers, ownersRaw,
      recentPayments, recentBookings // 🟢 Récupération pour le graphique
    ] = await Promise.all([
      prisma.user.count(),
      prisma.agency.count(),
      prisma.user.count({ where: { role: 'ARTISAN', isAvailable: true } }),
      prisma.property.count(),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.incident.count({ where: { status: { not: 'RESOLVED' } } }),
      prisma.incident.findMany({
        where: { status: { not: 'RESOLVED' } },
        take: 5, orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, priority: true, property: { select: { title: true } } }
      }),
      prisma.payment.aggregate({ _sum: { amountPlatform: true }, where: { status: 'SUCCESS' } }),
      prisma.bookingPayment.aggregate({ _sum: { platformCommission: true }, where: { status: 'SUCCESS' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
      prisma.bookingPayment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.user.findMany({
        where: { kyc: { status: "PENDING" } },
        select: { id: true, name: true, role: true, kyc: { select: { documents: true } } },
        take: 5, orderBy: { createdAt: 'desc' }
      }),
      prisma.user.findMany({
        where: { role: 'OWNER' },
        select: { id: true, name: true, finance: { select: { walletBalance: true } } },
        orderBy: { name: 'asc' }, take: 10 
      }),
      // Données temporelles pour le Chart.js
      prisma.payment.findMany({
          where: { status: 'SUCCESS', date: { gte: sevenDaysAgo } },
          select: { amountPlatform: true, date: true }
      }),
      prisma.bookingPayment.findMany({
          where: { status: 'SUCCESS', createdAt: { gte: sevenDaysAgo } },
          select: { platformCommission: true, createdAt: true }
      })
    ]);

    // SYNTHÈSE DES CHIFFRES
    const revenueLongTerm = platformRevenue._sum.amountPlatform || 0;
    const revenueShortTerm = bookingRevenue._sum.platformCommission || 0;
    const totalRevenue = revenueLongTerm + revenueShortTerm;
    const totalGrossVolume = (grossRentVolume._sum.amount || 0) + (grossBookingVolume._sum.amount || 0);

    // CONSTRUCTION DU GRAPHIQUE (Algorithme de regroupement par jour)
    const chartLabels: string[] = [];
    const chartData: number[] = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        if (i === 0) chartLabels.push('Auj');
        else if (i === 1) chartLabels.push('Hier');
        else chartLabels.push(`J-${i}`);

        const dayRent = recentPayments
            .filter(p => new Date(p.date).toISOString().split('T')[0] === dateStr)
            .reduce((sum, p) => sum + (p.amountPlatform || 0), 0);
            
        const dayBooking = recentBookings
            .filter(b => new Date(b.createdAt).toISOString().split('T')[0] === dateStr)
            .reduce((sum, b) => sum + (b.platformCommission || 0), 0);
            
        chartData.push(dayRent + dayBooking);
    }

    // MAPPING DES LISTES
    const formattedKycs = kycPendingUsers.map(u => ({
        id: u.id, name: u.name || "Inconnu", role: u.role, docUrl: u.kyc?.documents?.[0] || null 
    }));

    const formattedOwners = ownersRaw.map(o => ({
        id: o.id, name: o.name || "Propriétaire", walletBalance: o.finance?.walletBalance || 0
    }));

    // PAYLOAD FINAL
    return NextResponse.json({
      success: true,
      stats: {
        revenue: {
            total: totalRevenue, longTerm: revenueLongTerm, shortTerm: revenueShortTerm,
            grossVolume: totalGrossVolume, failedTransactions: failedPaymentsCount 
        },
        assets: { total: propertiesCount, activeBookings: activeBookings },
        hr: { users: usersCount, agencies: agenciesCount, artisansReady: artisansAvailable },
        ops: { incidentsCount: incidentsOpen, kycCount: kycPendingUsers.length }
      },
      chart: { labels: chartLabels, data: chartData },
      lists: {
        criticalIncidents: criticalIncidents.map(i => ({
            id: i.id, title: i.title, priority: i.priority, propertyTitle: i.property?.title || "N/A"
        })),
        pendingKycs: formattedKycs,
        owners: formattedOwners
      }
    });

  } catch (error) {
    console.error("War Room Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
});
