import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ⚡ PERFORMANCE : Cache de 60s (ISR)
// Permet de tenir la charge si 10 000 utilisateurs consultent la même annonce
export const revalidate = 60; 

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const listingId = params.id;

    if (!listingId) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    // ✅ REQUÊTE PRISMA OPTIMISÉE & SÉCURISÉE
    const listing = await prisma.listing.findFirst({
      where: { 
        id: listingId,
        isPublished: true, // 🔒 SÉCURITÉ : Bloque les brouillons et les bans
      },
      select: {
        // --- 1. Infos Générales ---
        id: true,
        title: true,
        description: true,
        pricePerNight: true,
        images: true,
        amenities: true, // Type Json dans votre Schema, passe directement
        accessVideoUrl: true,
        createdAt: true,

        // --- 2. Localisation ---
        address: true,
        city: true,
        neighborhood: true,
        latitude: true,
        longitude: true,
        landmark: true, // Utile pour situer (ex: "Près pharmacie...")

        // --- 3. Capacité ---
        bedrooms: true,
        bathrooms: true,
        maxGuests: true,
        
        // --- 4. Le Propriétaire (Profil Public Sécurisé) ---
        host: {
          select: {
            id: true,
            name: true,
            image: true,
            isVerified: true, // ✅ IMPORTANT : Indicateur de confiance (KYC)
            createdAt: true,  // "Membre depuis..."
            // ⛔️ PAS d'email, PAS de phone, PAS de revenus
          }
        },

        // --- 5. L'Agence (Si géré par un Pro) ---
        agency: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            slug: true,
            isActive: true // On suppose que le booléen existe ou isActive
          }
        },
        
        // --- 6. Preuve Sociale (Avis) ---
        reviews: {
            select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
                author: {
                    select: { 
                        name: true, 
                        image: true 
                    }
                }
            },
            take: 5, // On limite aux 5 derniers pour la vitesse
            orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!listing) {
      // 🔒 SÉCURITÉ : On renvoie 404 même si l'annonce existe mais n'est pas publiée.
      // Cela empêche un attaquant de scanner votre base pour trouver des ID valides.
      return NextResponse.json(
        { error: "Annonce introuvable ou indisponible." },
        { status: 404 }
      );
    }

    return NextResponse.json(listing);

  } catch (error) {
    console.error("🚨 API Error (Get Listing):", error);
    // En prod, message générique pour ne pas exposer la stack trace
    return NextResponse.json(
      { error: "Service momentanément indisponible." },
      { status: 500 }
    );
  }
}
