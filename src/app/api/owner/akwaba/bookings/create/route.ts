import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Qui paie ?
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Connectez-vous pour payer." }, { status: 401 });

    const guest = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!guest) return NextResponse.json({ error: "Compte introuvable" }, { status: 403 });

    const body = await request.json();
    const { listingId, startDate, endDate, guests } = body;

    // 2. VALIDATION
    if (!listingId || !startDate || !endDate) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < 1) return NextResponse.json({ error: "Minimum 1 nuit" }, { status: 400 });

    // 3. RECUPERATION PRIX & CHECK DISPO
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return NextResponse.json({ error: "Logement introuvable" }, { status: 404 });

    // Vérification Chevauchement (Double Booking)
    const conflict = await prisma.booking.findFirst({
        where: {
            listingId,
            status: { in: ['CONFIRMED', 'PAID'] },
            OR: [{ startDate: { lte: end }, endDate: { gte: start } }]
        }
    });

    if (conflict) {
        return NextResponse.json({ error: "Désolé, ces dates ne sont plus disponibles." }, { status: 409 });
    }

    // 4. CALCUL DU PRIX (Serveur)
    const totalPrice = listing.pricePerNight * nights;
    
    // 5. TRANSACTION : CRÉATION RÉSERVATION + PAIEMENT EN ATTENTE
    const booking = await prisma.$transaction(async (tx) => {
        // A. Créer le Booking
        const newBooking = await tx.booking.create({
            data: {
                startDate: start,
                endDate: end,
                totalPrice: totalPrice,
                status: "PENDING", // En attente de paiement
                guestId: guest.id,
                listingId: listing.id,
            }
        });

        // B. Créer l'intention de paiement
        await tx.bookingPayment.create({
            data: {
                amount: totalPrice,
                provider: "WAVE", // Par défaut, sera mis à jour par le webhook
                transactionId: uuidv4(), // ID Temporaire
                status: "PENDING",
                agencyCommission: Math.floor(totalPrice * 0.15), // 15% commission
                hostPayout: Math.floor(totalPrice * 0.85),
                bookingId: newBooking.id
            }
        });

        return newBooking;
    });

    return NextResponse.json({ success: true, bookingId: booking.id });

  } catch (error) {
    console.error("Erreur Booking:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
