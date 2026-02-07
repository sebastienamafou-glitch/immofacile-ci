import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma"; // Singleton
import { Prisma } from "@prisma/client"; // Pour le typage strict

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commune = searchParams.get("commune");

    // 1. Construction de la requête (Typage Strict)
    const whereClause: Prisma.PropertyWhereInput = {
      isPublished: true, // Le bien doit être visible
      // LOGIQUE STRICTE : Un bien est "Disponible" s'il n'a AUCUN bail actif
      leases: {
        none: {
            isActive: true
        }
      }
    };

    // 2. Filtre optionnel
    if (commune) {
      whereClause.commune = { 
        contains: commune, 
        mode: "insensitive" 
      };
    }

    // 3. Récupération des biens
    const properties = await prisma.property.findMany({
      where: whereClause,
      include: {
        owner: {
          select: { name: true } // On ne montre que le nom (Confidentialité)
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: properties });

  } catch (error) {
    console.error("Erreur chargement propriétés:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
