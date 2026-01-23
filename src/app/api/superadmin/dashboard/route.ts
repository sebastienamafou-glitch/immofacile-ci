import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client"; // ✅ IMPORT DE L'ENUM SÉCURISÉ

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. SÉCURITÉ & AUTHENTIFICATION
    // -------------------------------------------------------------------------
    const userEmail = request.headers.get("x-user-email");
    
    if (!userEmail) {
        return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ 
        where: { email: userEmail } 
    });

    // ✅ CORRECTION ICI : Utilisation de Role.SUPER_ADMIN
    if (!admin || admin.role !== Role.SUPER_ADMIN) {
        return NextResponse.json({ error: "Accès refusé. Droits d'administration requis." }, { status: 403 });
    }

    // -------------------------------------------------------------------------
    // 2. RÉCUPÉRATION DES DONNÉES
    // -------------------------------------------------------------------------
    const [
      usersCount,
      agenciesCount,
      propertiesCount,
      listingsCount,
      incidentsCount,
      kycPending,
      transactions,
      platformRevenue,
      bookingRevenue,
      ownersList
    ] = await Promise.all([
      // A. Comptes
      prisma.user.count(),
      prisma.agency.count(),

      // B. Parc Immobilier
      prisma.property.count(),
      prisma.listing.count(),

      // C. Alertes
      prisma.incident.count({ where: { status: "OPEN" } }),

      // D. KYC en attente
      prisma.user.findMany({
        where: { kycStatus: "PENDING" },
        select: { 
            id: true, 
            name: true, 
            role: true, 
            kycDocuments: true 
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      }),

      // E. Logs
      prisma.transaction.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, role: true } } }
      }),

      // F. Revenus
      prisma.payment.aggregate({ 
          _sum: { amountPlatform: true },
          where: { status: 'SUCCESS' }
      }),
      prisma.bookingPayment.aggregate({ 
          _sum: { agencyCommission: true },
          where: { status: 'SUCCESS' }
      }),

      // G. Propriétaires pour le Guichet
      prisma.user.findMany({
        where: { role: 'OWNER' },
        select: {
            id: true,
            name: true,
            email: true,
            walletBalance: true
        },
        orderBy: { name: 'asc' }
      })
    ]);

    // -------------------------------------------------------------------------
    // 3. CALCULS & FORMATAGE
    // -------------------------------------------------------------------------
    const totalRevenue = (platformRevenue._sum.amountPlatform || 0) + (bookingRevenue._sum.agencyCommission || 0);
    const totalAssets = propertiesCount + listingsCount;

    // Formatage KYC
    const formattedKycs = kycPending.map(u => ({
        id: u.id,
        name: u.name || "Utilisateur Inconnu",
        role: u.role,
        docUrl: (u.kycDocuments && u.kycDocuments.length > 0) ? u.kycDocuments[0] : null
    }));

    const formattedLogs = transactions.map(t => ({
        id: t.id,
        action: t.reason,
        amount: t.amount,
        type: t.type,
        user: t.user ? `${t.user.name}` : "Système",
        date: t.createdAt
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        users: usersCount,
        agencies: agenciesCount,
        assets: totalAssets,
        incidents: incidentsCount,
        kycCount: kycPending.length
      },
      lists: {
        pendingKycs: formattedKycs,
        logs: formattedLogs,
        owners: ownersList
      }
    });

  } catch (error) {
    console.error("Admin Dashboard API Error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
