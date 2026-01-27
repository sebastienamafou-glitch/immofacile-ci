import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { verifyToken } from "@/lib/auth"; //
import { differenceInDays } from "date-fns";

export async function POST(request: Request) {
  try {
    // 1. AUTHENTIFICATION BLINDÉE
    // On extrait l'utilisateur via le JWT, pas via un header modifiable
    const decodedToken = await verifyToken(request);
    const userId = decodedToken.id; 

    const body = await request.json();
    const { listingId, startDate, endDate } = body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 2. TRANSACTION ATOMIQUE (Prévention des doubles réservations)
    const result = await prisma.$transaction(async (tx) => {
        
        // RECUPÉRATION DE LA SOURCE DE VÉRITÉ (DB)
        const listing = await tx.listing.findUnique({
            where: { id: listingId },
            select: { pricePerNight: true, id: true }
        });

        if (!listing) throw new Error("NOT_FOUND");

        // VÉRIFICATION DE DISPONIBILITÉ (Lock-check)
        // Effectué à l'intérieur de la transaction pour bloquer les accès concurrents
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

        // CALCULS FINANCIERS SERVEUR (Protection contre la fraude)
        const nights = differenceInDays(end, start); //
        if (nights <= 0) throw new Error("INVALID_DATES");

        const subTotal = listing.pricePerNight * nights; //
        const agencyCommission = Math.round(subTotal * 0.10); //
        const totalPrice = subTotal + agencyCommission;

        // CRÉATION DE LA RÉSERVATION
        const newBooking = await tx.booking.create({
            data: {
                startDate: start,
                endDate: end,
                totalPrice: totalPrice,
                status: "PAID", //
                guestId: userId,
                listingId: listing.id,
            }
        });

        // TRACE DE PAIEMENT CONFORME AU SCHÉMA
        await tx.bookingPayment.create({
            data: {
                amount: totalPrice,
                provider: "WAVE", //
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
        "INVALID_DATES": { msg: "Dates invalides", status: 400 },
        "Token invalide ou expiré": { msg: "Session expirée", status: 401 }
    };

    const err = errorMap[error.message] || { msg: "Erreur serveur", status: 500 };
    return NextResponse.json({ error: err.msg }, { status: err.status });
  }
}
