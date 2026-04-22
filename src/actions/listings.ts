'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";

// ✅ 1. Nouvelle interface pour gérer les filtres avancés
interface SearchParams {
  query?: string;
  startDate?: string;
  endDate?: string;
}

export async function searchListings({ query = "", startDate, endDate }: SearchParams = {}) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;
    
    let userId = null;
    if (userEmail) {
        const user = await prisma.user.findUnique({ where: { email: userEmail } });
        if (user) userId = user.id;
    }

    // ✅ 2. LOGIQUE ANTI-CHEVAAUCHEMENT (Moteur de dispo)
    // On cherche les réservations qui se chevauchent avec les dates demandées
    const bookingConflictFilter = startDate && endDate ? {
      none: {
        AND: [
          { startDate: { lt: new Date(endDate) } },
          { endDate: { gt: new Date(startDate) } }
        ],
        OR: [
          { status: { in: [BookingStatus.PAID, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] } },
          { status: BookingStatus.PENDING, createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) } }
        ]
      }
    } : undefined;

    // 3. Requête Database avec le filtre intégré
    const listings = await prisma.listing.findMany({
      where: {
        isPublished: true,
        OR: query ? [
          { title: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { neighborhood: { contains: query, mode: 'insensitive' } },
        ] : undefined,
        bookings: bookingConflictFilter // 🛡️ Le filtre magique s'applique ici
      },
      include: {
        wishlists: userId ? { where: { userId: userId } } : false,
        host: { select: { name: true, image: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedListings = listings.map(l => ({
        id: l.id,
        title: l.title,
        price: l.pricePerNight,
        location: `${l.city}${l.neighborhood ? `, ${l.neighborhood}` : ''}`,
        image: l.images[0] || '/placeholder-house.jpg',
        rating: 4.8, 
        isFavorite: userId ? l.wishlists.length > 0 : false,
        host: l.host
    }));

    return { success: true, listings: formattedListings };

  } catch (error) {
    console.error("Erreur recherche:", error);
    return { success: false, error: "Impossible de charger les annonces" };
  }
}
