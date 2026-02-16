'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { differenceInDays, differenceInHours } from "date-fns";
import { redirect } from "next/navigation";

// ✅ 1. CRÉATION DE RÉSERVATION (Remplace route.ts)
export async function createBooking(listingId: string, startDate: string, endDate: string) {
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) return { success: false, error: "Vous devez être connecté." };
  if (!startDate || !endDate) return { success: false, error: "Dates invalides." };

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) return { success: false, error: "La date de départ doit être après l'arrivée." };

    // A. Récupération User & Listing
    const [user, listing] = await Promise.all([
        prisma.user.findUnique({ where: { email: userEmail } }),
        prisma.listing.findUnique({ where: { id: listingId } })
    ]);

    if (!user) return { success: false, error: "Compte introuvable." };
    if (!listing) return { success: false, error: "Logement introuvable." };

    // B. Calcul du Prix (Server-Side = Vérité absolue)
    const nights = differenceInDays(end, start);
    if (nights < 1) return { success: false, error: "Minimum 1 nuit." };

    const basePrice = listing.pricePerNight * nights;
    const serviceFee = Math.round(basePrice * 0.10); // 10%
    const finalCalculatedPrice = basePrice + serviceFee;

    // C. Vérification Disponibilité (Anti-Doublon)
    const conflict = await prisma.booking.findFirst({
      where: {
        listingId: listingId,
        status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } }
        ]
      }
    });

    if (conflict) {
      return { success: false, error: "Logement indisponible pour ces dates." };
    }

    // D. Création en base
    const newBooking = await prisma.booking.create({
      data: {
        startDate: start,
        endDate: end,
        totalPrice: finalCalculatedPrice,
        status: 'PENDING',
        guestId: user.id,
        listingId: listingId
      }
    });

    revalidatePath("/dashboard/guest/trips");
    return { success: true, bookingId: newBooking.id };

  } catch (error) {
    console.error("Erreur création booking:", error);
    return { success: false, error: "Erreur technique lors de la réservation." };
  }
}

// ✅ 2. ANNULATION (Déjà vu ensemble)
export async function cancelBooking(bookingId: string) {
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) return { success: false, error: "Non autorisé" };

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, payment: true }
    });

    if (!booking) return { success: false, error: "Réservation introuvable" };
    if (booking.guest.email !== userEmail) return { success: false, error: "Action interdite" };
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      return { success: false, error: "Déjà annulé ou terminé." };
    }

    const hoursBeforeStart = differenceInHours(new Date(booking.startDate), new Date());
    if (hoursBeforeStart < 24) {
       return { success: false, error: "Annulation impossible moins de 24h avant." };
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" }
    });

    // TODO: Logique Remboursement Stripe ici

    revalidatePath("/dashboard/guest/trips");
    return { success: true };

  } catch (error) {
    return { success: false, error: "Erreur serveur lors de l'annulation." };
  }
}
