import { prisma } from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';

export const isListingAvailable = async (
  listingId: string,
  startDate: Date,
  endDate: Date
): Promise<boolean> => {
  if (startDate >= endDate) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }

  // Requête Prisma pour trouver les réservations qui chevauchent la période demandée
  // Règle métier : On ignore les réservations annulées ou contestées
  const overlappingBookings = await prisma.booking.findMany({
    where: {
      listingId,
      status: {
        notIn: [BookingStatus.CANCELLED, BookingStatus.DISPUTED],
      },
      OR: [
        // La nouvelle réservation commence avant la fin d'une réservation existante, 
        // ET se termine après le début de cette même réservation existante.
        {
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      ],
    },
  });

  // S'il n'y a aucun chevauchement, le bien est disponible (true)
  return overlappingBookings.length === 0;
};
