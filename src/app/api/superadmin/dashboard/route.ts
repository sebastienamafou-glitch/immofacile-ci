import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
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
      
      // LISTES À TRAITER (Correction Schema ici)
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

      // --- KYC EN ATTENTE (Correction : Filtrage via Relation) ---
      prisma.user.findMany({
        where: { 
            kyc: { status: "PENDING" } // ✅ On filtre dans la table liée
        },
        select: { 
            id: true, 
            name: true, 
            role: true, 
            kyc: { select: { documents: true } } // ✅ On récupère les docs ici
        },
        take: 5, 
        orderBy: { createdAt: 'desc' }
      }),

      // --- LISTE PROPRIÉTAIRES (Correction : Solde via Finance) ---
      prisma.user.findMany({
        where: { role: 'OWNER' },
        select: { 
            id: true, 
            name: true, 
            finance: { select: { walletBalance: true } } // ✅ On récupère le solde ici
        },
        orderBy: { name: 'asc' },
        take: 10 // On limite pour éviter de surcharger le dashboard
      })
    ]);

    // 3. SYNTHÈSE ET REMAPPING
    const revenueLongTerm = platformRevenue._sum.amountPlatform || 0;
    const revenueShortTerm = bookingRevenue._sum.platformCommission || 0;
    const totalRevenue = revenueLongTerm + revenueShortTerm;

    // Aplatissage KYC
    const formattedKycs = kycPendingUsers.map(u => ({
        id: u.id,
        name: u.name || "Inconnu",
        role: u.role,
        docUrl: u.kyc?.documents?.[0] || null // Premier document pour aperçu
    }));

    // Aplatissage Owners
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
            kycCount: kycPendingUsers.length // Nombre récupéré de la requête liste (suffisant pour l'aperçu)
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
}
