import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { PropertyType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    // 1. Authentification & Vérification Rôle AGENCE
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { agency: true }
    });

    if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agencyId) {
      return NextResponse.json({ error: "Accès réservé aux agences" }, { status: 403 });
    }

    // 2. Récupération des données
    const body = await req.json();

    // 3. Validation Critique : Le Propriétaire
    if (!body.ownerId) {
        return NextResponse.json({ error: "Veuillez sélectionner un propriétaire (Bailleur)." }, { status: 400 });
    }

    // 4. Création du Mandat
    const property = await prisma.property.create({
      data: {
        title: body.title,
        description: body.description || "",
        address: body.address,
        commune: body.commune,
        
        // Conversions
        price: Number(body.price),
        surface: body.surface ? Number(body.surface) : null,
        bedrooms: Number(body.bedrooms) || 0,
        bathrooms: Number(body.bathrooms) || 0,
        type: body.type as PropertyType,
        
        images: body.images || [],
        isPublished: true, // Publié par défaut pour l'agence

        // 🟢 LE POINT CRUCIAL :
        ownerId: body.ownerId,       // Le bien appartient au CLIENT sélectionné
        agencyId: admin.agencyId     // Le bien est géré par VOTRE AGENCE
      }
    });

    return NextResponse.json({ success: true, property });

  } catch (error: any) {
    console.error("Erreur création mandat agence:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
