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

    // 1. TENTATIVE LONGUE DURÉE : Chercher dans la table Property
    const existingProperty = await prisma.property.findUnique({
      where: { id: params.id }
    });

    if (existingProperty) {
        if (existingProperty.ownerId !== session.user.id) {
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
        
        return NextResponse.json({ success: true, mode: "LONG_TERM" });
    }

    // 2. TENTATIVE COURTE DURÉE : Chercher dans la table Listing (Akwaba)
    const existingListing = await prisma.listing.findUnique({
        where: { id: params.id }
    });

    if (existingListing) {
        if (existingListing.hostId !== session.user.id) {
            return NextResponse.json({ error: "Action non autorisée sur cette annonce" }, { status: 403 });
        }

        await prisma.listing.update({
            where: { id: params.id },
            data: {
                title,
                description: description || "",
                address: address || commune,
                city: commune,
                pricePerNight: Number(price), // On mappe le prix sur le loyer journalier
                bedrooms: Number(bedrooms || 1),
                bathrooms: Number(bathrooms || 1),
                images: images || []
            }
        });

        return NextResponse.json({ success: true, mode: "SHORT_TERM" });
    }

    // 3. SI INTROUVABLE
    return NextResponse.json({ error: "Annonce introuvable dans la base de données" }, { status: 404 });

  } catch (error) {
    console.error("Erreur API Modification Propriété/Listing:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la mise à jour" }, { status: 500 });
  }
}
