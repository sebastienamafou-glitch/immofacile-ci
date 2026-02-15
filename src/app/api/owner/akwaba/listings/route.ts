import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ==========================================
// 1. GET : LISTER MES ANNONCES
// ==========================================
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. RÉCUPÉRATION
    const listings = await prisma.listing.findMany({
      where: {
        hostId: userId // 🔒 Verrouillage Propriétaire
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
            select: { bookings: true, reviews: true }
        }
      }
    });

    return NextResponse.json({ success: true, listings });

  } catch (error) {
    console.error("API Listings Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. POST : PUBLIER UNE NOUVELLE ANNONCE
// ==========================================
export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    
    // 2. VALIDATION DONNÉES
    if (!body.title || !body.pricePerNight || !body.address || !body.city) {
        return NextResponse.json({ error: "Champs obligatoires manquants (Titre, Prix, Adresse, Ville)" }, { status: 400 });
    }

    const price = Number(body.pricePerNight);
    if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
    }

    // 3. CRÉATION
    const newListing = await prisma.listing.create({
      data: {
        title: body.title,
        description: body.description || "",
        pricePerNight: price,
        
        address: body.address,
        city: body.city,
        neighborhood: body.neighborhood || "",
        
        images: body.images || [],
        amenities: body.amenities || {}, 
        
        isPublished: true, 
        
        hostId: userId 
      }
    });

    return NextResponse.json({ success: true, listing: newListing });

  } catch (error) {
    console.error("Erreur Création Listing:", error);
    return NextResponse.json({ error: "Erreur lors de la création de l'annonce." }, { status: 500 });
  }
}
