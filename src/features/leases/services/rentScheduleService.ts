import { prisma } from '@/lib/prisma';
import { Lease, RentStatus } from '@prisma/client';

export const generateRentSchedules = async (lease: Lease) => {
  if (!lease.endDate) {
    throw new Error("Génération impossible : Le bail doit avoir une date de fin définie.");
  }

  if (lease.startDate >= lease.endDate) {
    throw new Error("La date de début doit être strictement antérieure à la date de fin.");
  }

  const schedules = [];
  // On clone la date de début pour ne pas muter l'objet original
  const currentDate = new Date(lease.startDate);

  // Boucle de génération : Tant que la date courante est avant la date de fin
  while (currentDate < lease.endDate) {
    schedules.push({
      leaseId: lease.id,
      expectedDate: new Date(currentDate), 
      amount: lease.monthlyRent,
      status: RentStatus.PENDING,
    });

    // ✅ CORRECTION : On utilise l'UTC pour éviter le bug de l'heure d'été européenne
    currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
  }

  if (schedules.length === 0) {
    throw new Error("La durée du bail est trop courte pour générer un échéancier mensuel.");
  }

  // Insertion en masse dans PostgreSQL (Ultra performant)
  await prisma.rentSchedule.createMany({
    data: schedules,
  });

  return {
    success: true,
    count: schedules.length,
    schedules,
  };
};
