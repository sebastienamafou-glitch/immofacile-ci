import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // 1. On récupère les filtres depuis l'URL (ex: ?commune=Cocody)
    const { searchParams } = new URL(request.url);
    const commune = searchParams.get("commune");

    // 2. Construction de la requête
    const whereClause: any = {
      status: "AVAILABLE", // On ne veut que les biens libres !
    };

    if (commune) {
      whereClause.commune = { contains: commune, mode: "insensitive" };
    }

    // 3. Récupération des biens
    const properties = await prisma.property.findMany({
      where: whereClause,
      include: {
        owner: {
          select: { name: true } // On montre juste le nom du propriétaire/agence
        }
      },
      orderBy: { createdAt: "desc" } // Les plus récents en premier
    });

    return NextResponse.json({ success: true, data: properties });

  } catch (error) {
    console.error("Erreur chargement propriétés:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
