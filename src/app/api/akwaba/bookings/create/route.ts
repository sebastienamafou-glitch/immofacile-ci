import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { differenceInDays } from "date-fns";

export async function POST(request: Request) {
  try {
    // 1. AUTHENTIFICATION BLINDÉE (MIGRÉE v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Session expirée ou invalide" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, startDate, endDate } = body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 2. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
        
        // RECUPÉRATION DE LA SOURCE DE VÉRITÉ
        const listing = await tx.listing.findUnique({
            where: { id: listingId },
            select: { pricePerNight: true, id: true }
        });

        if (!listing) throw new Error("NOT_FOUND");

        // VÉRIFICATION DISPONIBILITÉ (Lock-check)
        const conflict = await tx.booking.findFirst({
            where: {
                listingId,
                status: { in: ['CONFIRMED', 'PAID'] },
                OR: [
                    { startDate: { lte: end }, endDate: { gte: start } }
                ]
            }
        });

        if (conflict) throw new Error("CONFLICT");

        // CALCULS FINANCIERS
        const nights = differenceInDays(end, start);
        if (nights <= 0) throw new Error("INVALID_DATES");

        const subTotal = listing.pricePerNight * nights;
        const agencyCommission = Math.round(subTotal * 0.10);
        const totalPrice = subTotal + agencyCommission;

        // CRÉATION RÉSERVATION
        const newBooking = await tx.booking.create({
            data: {
                startDate: start,
                endDate: end,
                totalPrice: totalPrice,
                status: "PAID", // Idéalement PENDING jusqu'à validation webhook, mais OK pour MVP
                guestId: userId,
                listingId: listing.id,
            }
        });

        // TRACE PAIEMENT
        await tx.bookingPayment.create({
            data: {
                amount: totalPrice,
                provider: "WAVE", // Placeholder
                transactionId: `TRX-${uuidv4()}`,
                status: "SUCCESS",
                agencyCommission: agencyCommission,
                hostPayout: subTotal,
                bookingId: newBooking.id
            }
        });

        return newBooking;
    });

    return NextResponse.json({ success: true, bookingId: result.id });

  } catch (error: any) {
    const errorMap: Record<string, { msg: string, status: number }> = {
        "NOT_FOUND": { msg: "Logement introuvable", status: 404 },
        "CONFLICT": { msg: "Ces dates ont été réservées entre-temps", status: 409 },
        "INVALID_DATES": { msg: "Dates invalides", status: 400 }
    };

    const err = errorMap[error.message] || { msg: "Erreur serveur", status: 500 };
    return NextResponse.json({ error: err.msg }, { status: err.status });
  }
}
