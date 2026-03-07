import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ✅ BONNE PRATIQUE : On enveloppe la route avec le wrapper auth()
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

    // 2. RÉCUPÉRATION PARALLÈLE (Optimisée)
    const [
      // EFFECTIFS
      usersCount,
      agenciesCount,
      artisansAvailable,
      
      // LOGISTIQUE
      propertiesCount,
      activeBookings,
      
      // OPÉRATIONS
      incidentsOpen,
      criticalIncidents,
      
      // FINANCES
      platformRevenue,
      bookingRevenue,
      
      // LISTES À TRAITER 
      kycPendingUsers,
      ownersRaw
    ] = await Promise.all([
      // --- Counts ---
      prisma.user.count(),
      prisma.agency.count(),
      prisma.user.count({ where: { role: 'ARTISAN', isAvailable: true } }),

      // --- Logistique ---
      prisma.property.count(),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),

      // --- Incidents ---
      prisma.incident.count({ where: { status: { not: 'RESOLVED' } } }),
      prisma.incident.findMany({
        where: { status: { not: 'RESOLVED' } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            priority: true,
            property: { select: { title: true } }
        }
      }),

      // --- Finances ---
      prisma.payment.aggregate({ _sum: { amountPlatform: true }, where: { status: 'SUCCESS' } }),
      prisma.bookingPayment.aggregate({ _sum: { platformCommission: true }, where: { status: 'SUCCESS' } }),

      // --- KYC EN ATTENTE ---
      prisma.user.findMany({
        where: { 
            kyc: { status: "PENDING" } 
        },
        select: { 
            id: true, 
            name: true, 
            role: true, 
            kyc: { select: { documents: true } } 
        },
        take: 5, 
        orderBy: { createdAt: 'desc' }
      }),

      // --- LISTE PROPRIÉTAIRES ---
      prisma.user.findMany({
        where: { role: 'OWNER' },
        select: { 
            id: true, 
            name: true, 
            finance: { select: { walletBalance: true } } 
        },
        orderBy: { name: 'asc' },
        take: 10 
      })
    ]);

    // 3. SYNTHÈSE ET REMAPPING
    const revenueLongTerm = platformRevenue._sum.amountPlatform || 0;
    const revenueShortTerm = bookingRevenue._sum.platformCommission || 0;
    const totalRevenue = revenueLongTerm + revenueShortTerm;

    const formattedKycs = kycPendingUsers.map(u => ({
        id: u.id,
        name: u.name || "Inconnu",
        role: u.role,
        docUrl: u.kyc?.documents?.[0] || null 
    }));

    const formattedOwners = ownersRaw.map(o => ({
        id: o.id,
        name: o.name || "Propriétaire",
        walletBalance: o.finance?.walletBalance || 0
    }));

    return NextResponse.json({
      success: true,
      stats: {
        revenue: {
            total: totalRevenue,
            longTerm: revenueLongTerm,
            shortTerm: revenueShortTerm
        },
        assets: {
            total: propertiesCount,
            activeBookings: activeBookings
        },
        hr: {
            users: usersCount,
            agencies: agenciesCount,
            artisansReady: artisansAvailable
        },
        ops: {
            incidentsCount: incidentsOpen,
            kycCount: kycPendingUsers.length 
        }
      },
      lists: {
        criticalIncidents: criticalIncidents.map(i => ({
            id: i.id,
            title: i.title,
            priority: i.priority,
            propertyTitle: i.property?.title || "N/A"
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
