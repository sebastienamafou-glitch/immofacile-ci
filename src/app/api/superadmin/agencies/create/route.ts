import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DES AGENCES (AVEC KPI)
    const agencies = await prisma.agency.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { 
            listings: true,   // Nombre d'annonces
            properties: true, // Nombre de biens
            users: true       // Nombre d'agents/membres
          }
        },
        // On récupère l'admin de l'agence pour contact
        users: {
            where: { role: 'AGENCY_ADMIN' },
            select: { name: true, email: true, phone: true },
            take: 1
        }
      }
    });

    // 3. FORMATAGE POUR LE DASHBOARD
    const formattedAgencies = agencies.map(agency => ({
        id: agency.id,
        name: agency.name,
        code: agency.code,
        walletBalance: agency.walletBalance,
        isActive: agency.isActive,
        stats: {
            listings: agency._count.listings,
            properties: agency._count.properties,
            staff: agency._count.users
        },
        admin: agency.users[0] || { name: "Non assigné", email: "N/A" },
        createdAt: agency.createdAt
    }));

    return NextResponse.json({ success: true, agencies: formattedAgencies });

  } catch (error) {
    console.error("List Agencies Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
