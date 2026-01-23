import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Utilisateur non identifié" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    const body = await request.json();
    const { listingId, startDate, endDate } = body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Vérification Listing & Prix
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return NextResponse.json({ error: "Logement introuvable" }, { status: 404 });

    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = listing.pricePerNight * nights; // ✅ Utilisation de pricePerNight (Schema)

    // 2. Vérification Disponibilité (Anti-Overlapping)
    const conflict = await prisma.booking.findFirst({
        where: {
            listingId,
            status: { in: ['CONFIRMED', 'PAID'] },
            OR: [{ startDate: { lte: end }, endDate: { gte: start } }]
        }
    });

    if (conflict) {
        return NextResponse.json({ error: "Dates déjà réservées." }, { status: 409 });
    }

    // 3. Transaction : Création Booking + Paiement
    const result = await prisma.$transaction(async (tx) => {
        // Création Réservation
        const newBooking = await tx.booking.create({
            data: {
                startDate: start,
                endDate: end,
                totalPrice: totalPrice,
                status: "PAID", // Simulé comme payé direct
                guestId: user.id,
                listingId: listing.id,
            }
        });

        // Création Trace Paiement
        await tx.bookingPayment.create({
            data: {
                amount: totalPrice,
                provider: "WAVE",
                transactionId: uuidv4(),
                status: "SUCCESS",
                agencyCommission: 0,
                hostPayout: totalPrice,
                bookingId: newBooking.id
            }
        });

        return newBooking;
    });

    return NextResponse.json({ success: true, bookingId: result.id });

  } catch (error) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
