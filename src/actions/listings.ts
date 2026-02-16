'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function searchListings(query: string = "") {
  try {
    // 1. Identification sécurisée (pour les favoris)
    const session = await auth();
    const userEmail = session?.user?.email;
    
    let userId = null;
    if (userEmail) {
        const user = await prisma.user.findUnique({ where: { email: userEmail } });
        if (user) userId = user.id;
    }

    // 2. Requête Database
    const listings = await prisma.listing.findMany({
      where: {
        isPublished: true,
        OR: query ? [
          { title: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { neighborhood: { contains: query, mode: 'insensitive' } },
        ] : undefined
      },
      include: {
        // On vérifie si l'utilisateur a mis ce bien en favori
        wishlists: userId ? {
            where: { userId: userId }
        } : false,
        // On récupère une image
        host: { select: { name: true, image: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Formatage des données
    const formattedListings = listings.map(l => ({
        id: l.id,
        title: l.title,
        price: l.pricePerNight,
        location: `${l.city}${l.neighborhood ? `, ${l.neighborhood}` : ''}`,
        image: l.images[0] || '/placeholder-house.jpg',
        rating: 4.8, // Valeur par défaut ou calculée plus tard
        isFavorite: userId ? l.wishlists.length > 0 : false,
        host: l.host
    }));

    return { success: true, listings: formattedListings };

  } catch (error) {
    console.error("Erreur recherche:", error);
    return { success: false, error: "Impossible de charger les annonces" };
  }
}
