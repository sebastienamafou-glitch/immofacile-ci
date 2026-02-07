import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ============================================================================
// POST : Convertir un bien "Longue Durée" en annonce "Akwaba" (Court Séjour)
// ============================================================================
export async function POST(req: Request) {
  try {
    // 1. AUTH ZERO TRUST
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    
    // Validation minimale
    if (!body.propertyId || !body.pricePerNight) {
        return NextResponse.json({ error: "ID du bien et Prix par nuit requis" }, { status: 400 });
    }

    // 2. VÉRIFICATION DU BIEN SOURCE (Anti-IDOR)
    const sourceProperty = await prisma.property.findUnique({
        where: { id: body.propertyId }
    });

    if (!sourceProperty) {
        return NextResponse.json({ error: "Bien source introuvable" }, { status: 404 });
    }

    // Le verrou : Ce bien m'appartient-il ?
    if (sourceProperty.ownerId !== userId) {
        return NextResponse.json({ error: "Accès refusé à ce bien." }, { status: 403 });
    }

    // 3. VÉRIFICATION DE DOUBLON
    const existingListing = await prisma.listing.findFirst({
        where: { propertyId: sourceProperty.id }
    });

    if (existingListing) {
        return NextResponse.json({ error: "Ce bien est déjà publié sur Akwaba." }, { status: 409 });
    }

    // 4. RÉCUPÉRATION INFOS AGENCE (Optionnel)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { agencyId: true }
    });

    // 5. DUPLICATION : Création de l'annonce
    const newListing = await prisma.listing.create({
        data: {
            title: sourceProperty.title,
            description: sourceProperty.description || "Aucune description.",
            pricePerNight: Number(body.pricePerNight),
            
            // Héritage géographique
            address: sourceProperty.address,
            city: sourceProperty.commune, 
            neighborhood: sourceProperty.commune, // Par défaut
            
            // Héritage caractéristiques
            bedrooms: sourceProperty.bedrooms,
            bathrooms: sourceProperty.bathrooms,
            maxGuests: sourceProperty.bedrooms * 2, // Règle métier par défaut
            
            images: sourceProperty.images,
            isPublished: true, // Publié par défaut à la conversion
            
            // Equipements par défaut (à modifier plus tard)
            amenities: { wifi: true, ac: true, tv: false, parking: true }, 

            // Liaisons
            hostId: userId,
            propertyId: sourceProperty.id,
            agencyId: user?.agencyId
        }
    });

    return NextResponse.json({ success: true, listing: newListing });

  } catch (error) {
    console.error("🚨 Erreur API Listing:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la publication" }, { status: 500 });
  }
}

// ============================================================================
// GET : Lister mes annonces Akwaba
// ============================================================================
export async function GET(req: Request) {
    try {
      const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
      if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
      const listings = await prisma.listing.findMany({
        where: { hostId: userId },
        include: { 
            _count: { select: { bookings: true } } // Compteur de réservations
        },
        orderBy: { createdAt: 'desc' }
      });
  
      return NextResponse.json({ success: true, listings });
  
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
