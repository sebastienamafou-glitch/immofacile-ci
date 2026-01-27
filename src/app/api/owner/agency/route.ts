import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ==========================================
// 1. GET : INFOS AGENCE DU PROPRIÉTAIRE
// ==========================================
export async function GET(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        agency: true,
        propertiesOwned: {
            where: { agencyId: { not: null } },
            select: { id: true }
        }
      }
    });

    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 404 });

    if (!user.agency) {
        return NextResponse.json({ hasAgency: false });
    }

    // Calcul stats basiques pour le dashboard
    // Dans une app réelle, on ferait des agrégations plus complexes sur les Payments
    const stats = {
        totalRevenue: 0, // À implémenter avec la table Payment
        managedListings: user.propertiesOwned.length
    };

    return NextResponse.json({
        hasAgency: true,
        agency: {
            name: user.agency.name,
            logoUrl: user.agency.logoUrl,
            phone: user.agency.phone,
            email: user.agency.email
        },
        stats
    });

  } catch (error) {
    console.error("API Agency Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. POST : LIER À UNE AGENCE
// ==========================================
export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { agencyCode } = await req.json();
    if (!agencyCode) return NextResponse.json({ error: "Code requis" }, { status: 400 });

    // Recherche Agence
    const agency = await prisma.agency.findUnique({
        where: { code: agencyCode.toUpperCase() }
    });

    if (!agency) {
        return NextResponse.json({ error: "Code agence invalide." }, { status: 404 });
    }

    // Mise à jour User + Ses Propriétés existantes
    await prisma.$transaction([
        // 1. Lier le User
        prisma.user.update({
            where: { id: userId },
            data: { agencyId: agency.id }
        }),
        // 2. Transférer la gestion de ses propriétés existantes (Optionnel, selon règle métier)
        prisma.property.updateMany({
            where: { ownerId: userId },
            data: { agencyId: agency.id }
        })
    ]);

    return NextResponse.json({ 
        success: true, 
        agencyName: agency.name 
    });

  } catch (error) {
    console.error("API Agency Link Error:", error);
    return NextResponse.json({ error: "Erreur lors de la liaison" }, { status: 500 });
  }
}
