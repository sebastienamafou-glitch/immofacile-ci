import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ : Identité via Headers (Middleware)
    const userEmail = req.headers.get("x-user-email");
    
    if (!userEmail) {
      return NextResponse.json({ error: "Non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const body = await req.json();
    const { listingId, startDate, endDate } = body; // ON IGNORE 'totalPrice' envoyé par le client

    // Validation basique
    if (!listingId || !startDate || !endDate) {
      return NextResponse.json({ error: "Dates et logement requis." }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validation cohérence dates
    if (start >= end) {
        return NextResponse.json({ error: "La date de départ doit être après l'arrivée." }, { status: 400 });
    }

    // 2. RÉCUPÉRATION DONNÉES FIABLES (Server Side)
    // On charge l'utilisateur ET le Listing pour avoir le vrai prix
    const [user, listing] = await Promise.all([
        prisma.user.findUnique({ where: { email: userEmail } }),
        prisma.listing.findUnique({ where: { id: listingId } })
    ]);

    if (!user) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    if (!listing) return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });

    // 3. RE-CALCUL DU PRIX (La seule vérité)
    const nights = differenceInDays(end, start);
    if (nights < 1) return NextResponse.json({ error: "Minimum 1 nuit." }, { status: 400 });

    const basePrice = listing.pricePerNight * nights;
    const serviceFee = Math.round(basePrice * 0.10); // 10% Frais ImmoFacile
    const finalCalculatedPrice = basePrice + serviceFee;

    // 4. CHECK DISPONIBILITÉ (Anti-Doublon)
    const conflict = await prisma.booking.findFirst({
      where: {
        listingId: listingId,
        status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN'] }, // On ignore les annulées ou pending expirées
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start }
          }
        ]
      }
    });

    if (conflict) {
      return NextResponse.json({ error: "Ce logement n'est plus disponible pour ces dates." }, { status: 409 });
    }

    // 5. CRÉATION ATOMIQUE (Statut PENDING)
    const newBooking = await prisma.booking.create({
      data: {
        startDate: start,
        endDate: end,
        totalPrice: finalCalculatedPrice, // ✅ On utilise le prix calculé par le serveur
        status: 'PENDING', // ✅ En attente de paiement
        guestId: user.id,
        listingId: listingId
      }
    });

    return NextResponse.json({ 
        success: true, 
        bookingId: newBooking.id,
        totalPrice: finalCalculatedPrice, // On renvoie le vrai prix pour confirmation UI
        message: "Réservation initiée. En attente de paiement." 
    });

  } catch (error) {
    console.error("Erreur Booking:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la réservation" }, { status: 500 });
  }
}
