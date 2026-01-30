import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ (Identity Check)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true }
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé. Niveau Général requis." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DES DONNÉES STRATÉGIQUES
    const [
      // EFFECTIFS
      usersCount,
      agenciesCount,
      artisansAvailable, // Nouveau : Artisans prêts à intervenir
      
      // LOGISTIQUE
      propertiesCount,
      activeBookings, // Nouveau : Réservations Akwaba en cours
      
      // OPÉRATIONS (Incidents)
      incidentsOpen,
      criticalIncidents, // Nouveau : Liste des incidents urgents
      
      // FINANCES
      platformRevenue, // Revenu Gestion
      bookingRevenue,  // Revenu Akwaba
      
      // LISTES
      kycPending,
      ownersList
    ] = await Promise.all([
      // --- EFFECTIFS ---
      prisma.user.count(),
      prisma.agency.count(),
      prisma.user.count({ where: { role: 'ARTISAN', isAvailable: true } }),

      // --- LOGISTIQUE ---
      prisma.property.count(),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),

      // --- OPÉRATIONS ---
      prisma.incident.count({ where: { status: { not: 'RESOLVED' } } }),
      // On récupère les 5 derniers incidents non résolus pour affichage
      prisma.incident.findMany({
        where: { status: { not: 'RESOLVED' } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { property: { select: { title: true } } }
      }),

      // --- FINANCES ---
      prisma.payment.aggregate({ _sum: { amountPlatform: true }, where: { status: 'SUCCESS' } }),
      prisma.bookingPayment.aggregate({ _sum: { platformCommission: true }, where: { status: 'SUCCESS' } }),

      // --- ADMIN ---
      prisma.user.findMany({
        where: { kycStatus: "PENDING" },
        select: { id: true, name: true, role: true, kycDocuments: true },
        take: 5, orderBy: { createdAt: 'desc' }
      }),
      prisma.user.findMany({
        where: { role: 'OWNER' },
        select: { id: true, name: true, walletBalance: true },
        orderBy: { name: 'asc' }
      })
    ]);

    // 3. SYNTHÈSE DES DONNÉES
    const revenueLongTerm = platformRevenue._sum.amountPlatform || 0;
    const revenueShortTerm = bookingRevenue._sum.platformCommission || 0;
    const totalRevenue = revenueLongTerm + revenueShortTerm;

    const formattedKycs = kycPending.map(u => ({
        id: u.id,
        name: u.name || "Inconnu",
        role: u.role,
        docUrl: u.kycDocuments?.[0] || null
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
            kycCount: kycPending.length
        }
      },
      lists: {
        criticalIncidents,
        pendingKycs: formattedKycs,
        owners: ownersList
      }
    });

  } catch (error) {
    console.error("War Room Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
