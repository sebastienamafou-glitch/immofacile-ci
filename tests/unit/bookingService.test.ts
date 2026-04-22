import { describe, it, expect, beforeEach } from 'vitest';
import { isListingAvailable } from '@/features/akwaba/services/bookingService';
import { prismaMock } from '../setup/vitest.setup';
import { Booking } from '@prisma/client';

describe('Service : Moteur Anti-Surbooking', () => {

  // Dates de référence pour nos tests
  const requestedStart = new Date('2026-05-01T14:00:00Z');
  const requestedEnd = new Date('2026-05-10T10:00:00Z');

  it('doit renvoyer TRUE si aucune réservation ne chevauche', async () => {
    // Arrange : Prisma ne trouve rien (tableau vide)
    prismaMock.booking.findMany.mockResolvedValue([]);

    // Act
    const isAvailable = await isListingAvailable('listing-123', requestedStart, requestedEnd);

    // Assert
    expect(isAvailable).toBe(true);
    expect(prismaMock.booking.findMany).toHaveBeenCalledTimes(1);
  });

  it('doit renvoyer FALSE si une réservation bloque les dates', async () => {
    // Arrange : Prisma trouve une réservation existante (on simule juste la présence d'un objet partiel validé par TypeScript)
    const mockConflictingBooking = { id: 'booking-conflict' } as Booking;
    prismaMock.booking.findMany.mockResolvedValue([mockConflictingBooking]);

    // Act
    const isAvailable = await isListingAvailable('listing-123', requestedStart, requestedEnd);

    // Assert
    expect(isAvailable).toBe(false);
  });

  it('doit rejeter les dates invalides (début postérieur à la fin)', async () => {
    const invalidEnd = new Date('2026-04-25T10:00:00Z'); // Date antérieure au début

    // Act & Assert
    await expect(
      isListingAvailable('listing-123', requestedStart, invalidEnd)
    ).rejects.toThrow("La date de fin doit être postérieure à la date de début.");

    // Prisma ne doit même pas être appelé pour économiser de la performance
    expect(prismaMock.booking.findMany).not.toHaveBeenCalled();
  });

});
