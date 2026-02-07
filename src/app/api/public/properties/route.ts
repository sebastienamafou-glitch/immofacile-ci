
export const dynamic = 'force-dynamic'; 
import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Récupération des paramètres URL (Filtres)
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const commune = searchParams.get('commune');
    const maxPrice = searchParams.get('maxPrice');

    // Construction du filtre dynamique
    const whereClause: any = {
      isPublished: true, // Seuls les biens publiés
      // On vérifie qu'il n'y a pas de bail ACTIF en cours
      leases: {
        none: {
          isActive: true
        }
      }
    };

    if (type) whereClause.type = type;
    if (commune) whereClause.commune = { contains: commune, mode: 'insensitive' };
    if (maxPrice) whereClause.price = { lte: parseInt(maxPrice) };

    const properties = await prisma.property.findMany({
      where: whereClause,
      select: { // SÉCURITÉ : On ne sélectionne QUE les champs publics
        id: true,
        title: true,
        description: true,
        price: true,
        commune: true,
        address: true, // Peut-être masquer le numéro de rue précis ?
        type: true,
        bedrooms: true,
        bathrooms: true,
        surface: true,
        images: true,
        createdAt: true,
        // On ne renvoie PAS ownerId ou les données financières sensibles
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(properties);

  } catch (error) {
    console.error("Erreur Fetch Properties:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
