import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    
    // Identification optionnelle pour les favoris
    const userEmail = req.headers.get("x-user-email");
    let userId = null;
    if (userEmail) {
        const user = await prisma.user.findUnique({ where: { email: userEmail } });
        if (user) userId = user.id;
    }

    // REQUÊTE DATABASE
    const listings = await prisma.listing.findMany({
      where: {
        isPublished: true, // Uniquement les biens validés
        OR: query ? [
          { title: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { neighborhood: { contains: query, mode: 'insensitive' } },
        ] : undefined
      },
      include: {
        // On inclut les favoris de cet utilisateur spécifique pour savoir si coeur rouge ou vide
        wishlists: userId ? {
            where: { userId: userId }
        } : false
      },
      orderBy: { createdAt: 'desc' }
    });

    // MAPPING pour le frontend
    const formattedListings = listings.map(l => ({
        id: l.id,
        title: l.title,
        price: l.pricePerNight,
        location: `${l.city}, ${l.neighborhood || ''}`,
        image: l.images[0] || '/placeholder-house.jpg',
        rating: 4.8, // Fake rating pour la V1 ou à calculer via table Review
        isFavorite: userId ? l.wishlists.length > 0 : false
    }));

    return NextResponse.json({ success: true, listings: formattedListings });

  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
