"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import { differenceInDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { differenceInHours } from "date-fns";

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
    const booking = await prisma.$transaction(async (tx) => {
      
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
        select: { pricePerNight: true, maxGuests: true, hostId: true },
      });

      if (!listing) throw new Error("Logement introuvable.");
      if (listing.hostId === session.user.id) throw new Error("OWNER_BOOKING");
      if (guestCount > listing.maxGuests) throw new Error("Capacité maximale dépassée.");

      const nights = Math.max(1, differenceInDays(end, start));
      
      // ✅ CALCUL FINANCIER STRICT (Prix de base + 10% Frais Plateforme)
      const basePrice = listing.pricePerNight * nights;
      const serviceFee = Math.round(basePrice * 0.10); 
      const totalPrice = basePrice + serviceFee;

      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const conflict = await tx.booking.findFirst({
        where: {
          listingId: listingId,
          AND: [
            { startDate: { lt: end } },
            { endDate: { gt: start } },
          ],
          OR: [
            { status: { in: [BookingStatus.PAID, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] } },
            { status: BookingStatus.PENDING, createdAt: { gt: fifteenMinutesAgo } },
          ],
        },
      });

      if (conflict) {
        throw new Error("DATES_UNAVAILABLE");
      }

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

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "DATES_UNAVAILABLE") return { success: false, error: "Ces dates viennent d'être réservées par un autre utilisateur." };
    if (msg === "OWNER_BOOKING") return { success: false, error: "Impossible de réserver votre propre bien." };
    return { success: false, error: "Erreur lors de la réservation." };
  }
}
// ✅ 2. ANNULATION DE RÉSERVATION
export async function cancelBooking(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Non autorisé" };

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { guestId: true, status: true, startDate: true }
    });

    if (!booking) return { success: false, error: "Réservation introuvable" };
    if (booking.guestId !== session.user.id) return { success: false, error: "Action interdite" };
    
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      return { success: false, error: "Déjà annulé ou terminé." };
    }

    const hoursBeforeStart = differenceInHours(new Date(booking.startDate), new Date());
    
    // On empêche l'annulation si le séjour est dans moins de 24h ET que c'est déjà payé/confirmé
    if (hoursBeforeStart < 24 && booking.status !== "PENDING") {
       return { success: false, error: "Annulation impossible moins de 24h avant le séjour." };
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" }
    });

    revalidatePath("/dashboard/guest/trips");
    return { success: true };

  } catch (error) {
    console.error("Erreur annulation:", error);
    return { success: false, error: "Erreur serveur lors de l'annulation." };
  }
}
