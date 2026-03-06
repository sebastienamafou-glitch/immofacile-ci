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
    const { 
        rentalMode, // "LONG_TERM" | "SHORT_TERM"
        title, description, address, commune, price, type, bedrooms, bathrooms, surface, images 
    } = body;

    if (!title || !price || !commune || !type || !rentalMode) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    if (rentalMode === "SHORT_TERM") {
        // 🏨 LOGIQUE COURTE DURÉE (AKWABA) -> Table Listing
        const listing = await prisma.listing.create({
            data: {
                title,
                description: description || "Superbe logement pour vos courts séjours.",
                address: address || commune,
                city: commune,
                pricePerNight: Number(price),
                bedrooms: Number(bedrooms || 1),
                bathrooms: Number(bathrooms || 1),
                images: images || [],
                hostId: session.user.id,
                isPublished: true,
                amenities: ["Climatisation", "Wi-Fi", "TV"], // Équipements par défaut
                maxGuests: Number(bedrooms || 1) * 2,
            }
        });
        return NextResponse.json({ success: true, propertyId: listing.id, mode: "SHORT_TERM" });
    } else {
        // 🏠 LOGIQUE LONGUE DURÉE CLASSIQUE -> Table Property
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
        return NextResponse.json({ success: true, propertyId: property.id, mode: "LONG_TERM" });
    }

  } catch (error) {
    console.error("Erreur API Création Propriété:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la publication" }, { status: 500 });
  }
}
