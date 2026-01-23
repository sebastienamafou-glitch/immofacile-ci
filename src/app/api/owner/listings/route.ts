import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ==========================================
// 1. POST : Créer une annonce Akwaba depuis une Propriété
// ==========================================
export async function POST(req: Request) {
  try {
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner || owner.role !== "OWNER") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    
    // Champs requis pour la conversion
    if (!body.propertyId || !body.pricePerNight) {
        return NextResponse.json({ error: "ID du bien et Prix par nuit requis" }, { status: 400 });
    }

    // 1. On récupère le bien source (Longue durée)
    const sourceProperty = await prisma.property.findUnique({
        where: { id: body.propertyId, ownerId: owner.id }
    });

    if (!sourceProperty) {
        return NextResponse.json({ error: "Bien source introuvable" }, { status: 404 });
    }

    // 2. On vérifie si une annonce existe déjà pour ce bien
    const existingListing = await prisma.listing.findFirst({
        where: { propertyId: sourceProperty.id }
    });

    if (existingListing) {
        return NextResponse.json({ error: "Ce bien est déjà publié sur Akwaba." }, { status: 409 });
    }

    // 3. DUPLICATION : On crée le Listing Akwaba
    const newListing = await prisma.listing.create({
        data: {
            title: sourceProperty.title,
            
            // ✅ CORRECTION ICI : On assure que ce n'est jamais null
            description: sourceProperty.description || "", 
            
            pricePerNight: Number(body.pricePerNight),
            
            // Données géographiques
            address: sourceProperty.address,
            city: sourceProperty.commune, 
            neighborhood: sourceProperty.commune,
            
            // Caractéristiques
            bedrooms: sourceProperty.bedrooms,
            bathrooms: sourceProperty.bathrooms,
            maxGuests: sourceProperty.bedrooms * 2,
            
            images: sourceProperty.images,
            isPublished: true,
            
            // ✅ AJOUT OBLIGATOIRE (Selon Schema)
            amenities: { wifi: true, ac: true }, 

            // Liaisons
            hostId: owner.id,
            propertyId: sourceProperty.id,
            agencyId: owner.agencyId
        }
    });

    return NextResponse.json({ success: true, listing: newListing });

  } catch (error) {
    console.error("Erreur création Listing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. GET : Lister mes annonces Akwaba
// ==========================================
export async function GET(req: Request) {
    try {
      const userEmail = req.headers.get("x-user-email");
      if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
      const owner = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });
  
      const listings = await prisma.listing.findMany({
        where: { hostId: owner.id },
        include: { bookings: true },
        orderBy: { createdAt: 'desc' }
      });
  
      return NextResponse.json({ success: true, listings });
  
    } catch (error) {
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
