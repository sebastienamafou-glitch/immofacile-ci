import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST : Qui paie ? (Le locataire/guest)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Connectez-vous pour payer." }, { status: 401 });

    const body = await request.json();
    const { listingId, startDate, endDate, guests } = body;

    // 2. VALIDATION
    if (!listingId || !startDate || !endDate) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calcul précis des nuitées
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (nights < 1) return NextResponse.json({ error: "Minimum 1 nuit" }, { status: 400 });

    // 3. RECUPERATION PRIX & CHECK DISPO
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return NextResponse.json({ error: "Logement introuvable" }, { status: 404 });

    // Anti-Double Booking (Strict)
    const conflict = await prisma.booking.findFirst({
        where: {
            listingId,
            status: { in: ['CONFIRMED', 'PAID'] },
            OR: [
                { startDate: { lte: end }, endDate: { gte: start } } // Chevauchement
            ]
        }
    });

    if (conflict) {
        return NextResponse.json({ error: "Désolé, ces dates ne sont plus disponibles." }, { status: 409 });
    }

    // 4. CALCUL DU PRIX (Serveur - Confiance Absolue)
    const totalPrice = listing.pricePerNight * nights;
    
    // Calcul Commission (Logique centralisée)
    const COMMISSION_RATE = 0.15; // 15%
    const commissionAmount = Math.floor(totalPrice * COMMISSION_RATE);
    const hostAmount = totalPrice - commissionAmount;

    // 5. TRANSACTION ATOMIQUE
    const booking = await prisma.$transaction(async (tx) => {
        // A. Créer le Booking
        const newBooking = await tx.booking.create({
            data: {
                startDate: start,
                endDate: end,
                totalPrice: totalPrice,
                status: "PENDING", // En attente de paiement
                guestId: userId,   // L'utilisateur connecté est le Guest
                listingId: listing.id,
            
            }
        });

        // B. Créer l'intention de paiement
        await tx.bookingPayment.create({
            data: {
                amount: totalPrice,
                provider: "WAVE", // Placeholder
                transactionId: crypto.randomUUID(), // Natif Node.js
                status: "PENDING",
                agencyCommission: commissionAmount,
                hostPayout: hostAmount,
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
