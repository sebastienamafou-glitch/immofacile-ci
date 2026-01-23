import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    
    // On récupère l'email pour savoir si l'user a liké les posts (si connecté)
    const userEmail = req.headers.get("x-user-email");
    let userId = null;
    
    if (userEmail) {
        const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } });
        if (user) userId = user.id;
    }

    // RECHERCHE DYNAMIQUE
    const listings = await prisma.listing.findMany({
      where: {
        isPublished: true, // Uniquement les annonces validées
        OR: query ? [
            { city: { contains: query, mode: 'insensitive' } },
            { neighborhood: { contains: query, mode: 'insensitive' } },
            { title: { contains: query, mode: 'insensitive' } }
        ] : undefined
      },
      include: {
        reviews: { select: { rating: true } }, // Pour la moyenne des notes
        wishlists: userId ? { where: { userId } } : false // Pour savoir si c'est favori
      },
      orderBy: { createdAt: 'desc' }
    });

    // FORMATAGE DES DONNÉES POUR LE FRONT
    const formattedListings = listings.map(l => {
        // Calcul note moyenne
        const totalRating = l.reviews.reduce((acc, r) => acc + r.rating, 0);
        const avgRating = l.reviews.length > 0 ? (totalRating / l.reviews.length).toFixed(1) : "Nouveau";

        return {
            id: l.id,
            title: l.title,
            price: l.pricePerNight,
            location: `${l.neighborhood || ''}, ${l.city}`,
            image: l.images[0] || null,
            rating: avgRating,
            isFavorite: l.wishlists.length > 0 // Si le tableau n'est pas vide, c'est liké
        };
    });

    return NextResponse.json({ success: true, listings: formattedListings });

  } catch (error) {
    console.error("Erreur Search:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
