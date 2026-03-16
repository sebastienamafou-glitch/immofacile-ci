"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import { differenceInDays } from "date-fns";

interface CreateBookingInput {
  listingId: string;
  startDate: Date;
  endDate: Date;
  guestCount: number;
}

export async function createSecureBooking(input: CreateBookingInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non autorisé." };
  }

  const { listingId, startDate, endDate, guestCount } = input;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    return { success: false, error: "Dates invalides." };
  }

  try {
    // 🚀 Lancement de la transaction atomique (Isole la requête de la concurrence)
    const booking = await prisma.$transaction(async (tx) => {
      
      // 1. Récupération sécurisée du prix côté serveur (Ne jamais faire confiance au client)
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
        select: { pricePerNight: true, maxGuests: true },
      });

      if (!listing) throw new Error("Logement introuvable.");
      if (guestCount > listing.maxGuests) throw new Error("Capacité maximale dépassée.");

      const nights = Math.max(1, differenceInDays(end, start));
      const totalPrice = listing.pricePerNight * nights;

      // 2. Vérification des chevauchements + Nettoyage passif (15 min TTL)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const conflict = await tx.booking.findFirst({
        where: {
          listingId: listingId,
          AND: [
            { startDate: { lt: end } },
            { endDate: { gt: start } },
          ],
          OR: [
            // Bloqué si Payé/Confirmé/En cours de séjour
            { status: { in: [BookingStatus.PAID, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] } },
            // Bloqué si PENDING mais créé il y a MOINS de 15 minutes
            { status: BookingStatus.PENDING, createdAt: { gt: fifteenMinutesAgo } },
          ],
        },
      });

      if (conflict) {
        throw new Error("DATES_UNAVAILABLE");
      }

      // 3. Création de la réservation avec le statut PENDING
      return await tx.booking.create({
        data: {
          listingId,
          guestId: session.user.id,
          startDate: start,
          endDate: end,
          totalPrice,
          guestCount,
          status: BookingStatus.PENDING,
        },
      });
    });

    return { success: true, bookingId: booking.id };

  } catch (error: any) {
    console.error("[BOOKING_ERROR]", error);
    if (error.message === "DATES_UNAVAILABLE") {
      return { success: false, error: "Ces dates viennent juste d'être réservées par un autre utilisateur." };
    }
    return { success: false, error: error.message || "Erreur lors de la réservation." };
  }
}
