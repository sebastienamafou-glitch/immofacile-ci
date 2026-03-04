import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PropertyType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, address, commune, price, type, bedrooms, bathrooms, surface, images } = body;

    if (!title || !price || !commune || !type) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const property = await prisma.property.create({
      data: {
        title,
        description: description || null,
        address: address || commune,
        commune,
        price: Number(price),
        type: type as PropertyType,
        bedrooms: Number(bedrooms || 0),
        bathrooms: Number(bathrooms || 0),
        surface: surface ? Number(surface) : null,
        images: images || [],
        ownerId: session.user.id,
        isPublished: true, 
        isAvailable: true
      }
    });

    return NextResponse.json({ success: true, propertyId: property.id });

  } catch (error) {
    console.error("Erreur API Création Propriété:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la publication" }, { status: 500 });
  }
}
