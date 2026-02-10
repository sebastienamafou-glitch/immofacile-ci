import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, PropertyType } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commune = searchParams.get("commune");
    const type = searchParams.get("type");

    // 1. Construction de la requête (Filtres de base)
    const whereClause: Prisma.PropertyWhereInput = {
      isPublished: true, // Le bien doit être visible (publié par le proprio)
      isAvailable: true, // Le bien doit être marqué "Disponible" (ex: pas en travaux)
      
      // LOGIQUE MÉTIER : Un bien n'est proposé que s'il n'a AUCUN bail actif
      leases: {
        none: {
            isActive: true
        }
      }
    };

    // 2. Filtres dynamiques (Commune & Type)
    if (commune) {
      whereClause.commune = { 
        contains: commune, 
        mode: "insensitive" // Insensible à la casse (ex: "cocody" trouve "Cocody")
      };
    }

    if (type && Object.values(PropertyType).includes(type as PropertyType)) {
      whereClause.type = type as PropertyType;
    }

    // 3. Récupération des données optimisée
    const properties = await prisma.property.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        price: true,
        commune: true,
        type: true,
        bedrooms: true,
        bathrooms: true,
        surface: true,
        images: true,
        // On inclut le nom du propriétaire uniquement si nécessaire pour l'affichage (confidentialité)
        owner: {
          select: { name: true } 
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: properties });

  } catch (error) {
    console.error("Erreur API Properties:", error);
    return NextResponse.json(
        { success: false, error: "Erreur serveur lors du chargement des biens" }, 
        { status: 500 }
    );
  }
}
