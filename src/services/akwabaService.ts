// src/services/akwabaService.ts
import { prisma } from "@/lib/prisma";
import { requireKyc } from "@/lib/gatekeeper";
import { differenceInDays } from "date-fns";

export async function createAkwabaBooking({
    userId,
    listingId,
    startDate,
    endDate
}: {
    userId: string;
    listingId: string;
    startDate: string | Date;
    endDate: string | Date;
}) {
    // 1. GATEKEEPER : KYC
    try {
        await requireKyc(userId);
    } catch {
        throw new Error("KYC_REQUIRED");
    }

    const start = new Date(startDate);
    start.setHours(14, 0, 0, 0); // Check-in 14h
    const end = new Date(endDate);
    end.setHours(11, 0, 0, 0); // Check-out 11h

    if (start >= end) {
        throw new Error("INVALID_DATES");
    }

    // 2. VÉRIFICATION DU LOGEMENT
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new Error("NOT_FOUND");
    if (listing.hostId === userId) throw new Error("OWNER_BOOKING");

    // 3. CALCUL FINANCIER SÉCURISÉ (10% de frais)
    const nights = differenceInDays(end, start);
    const billedNights = nights > 0 ? nights : 1; 
    const basePrice = listing.pricePerNight * billedNights;
    const serviceFee = Math.round(basePrice * 0.10); 
    const finalCalculatedPrice = basePrice + serviceFee;

    // 4. ALGORITHME ANTI-DOUBLON (Le fameux AND)
    const conflict = await prisma.booking.findFirst({
      where: {
        listingId: listingId,
        status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN'] },
        AND: [
            { startDate: { lt: end } },
            { endDate: { gt: start } }
        ]
      }
    });

    if (conflict) throw new Error("CONFLICT");

    // 5. CRÉATION EN BASE (Statut PENDING)
    const newBooking = await prisma.booking.create({
      data: {
        startDate: start,
        endDate: end,
        totalPrice: finalCalculatedPrice,
        status: 'PENDING',
        guestId: userId,
        listingId: listingId
      }
    });

    return newBooking;
}
