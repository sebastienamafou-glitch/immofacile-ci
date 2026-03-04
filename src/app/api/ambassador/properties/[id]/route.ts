import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PropertyType } from "@prisma/client";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, address, commune, price, type, bedrooms, bathrooms, surface, images } = body;

    // Sécurité stricte : s'assurer que l'utilisateur modifie SON annonce
    const existingProperty = await prisma.property.findUnique({
      where: { id: params.id }
    });

    if (!existingProperty || existingProperty.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Action non autorisée sur cette annonce" }, { status: 403 });
    }

    await prisma.property.update({
      where: { id: params.id },
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
        images: images || []
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur API Modification Propriété:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la mise à jour" }, { status: 500 });
  }
}
