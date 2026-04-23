'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PaymentProvider, PaymentStatus, PaymentType, RentStatus } from "@prisma/client";

export async function processCashPayment(rentScheduleId: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.agencyId) {
    return { success: false, message: "Non autorisé." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupération de l'échéance avec toutes les relations nécessaires pour le PDF
      const schedule = await tx.rentSchedule.findUnique({
        where: { id: rentScheduleId },
        include: {
          lease: {
            include: {
              tenant: true,
              property: true,
              agent: { include: { agency: true } }
            }
          }
        }
      });

      if (!schedule) throw new Error("Échéance introuvable.");
      if (schedule.status === RentStatus.PAID) throw new Error("Ce loyer est déjà payé.");
      if (schedule.lease.property.agencyId !== session.user.agencyId) throw new Error("Ce bien n'appartient pas à votre agence.");

      // 2. Création du Paiement CASH
      const payment = await tx.payment.create({
        data: {
          amount: schedule.amount,
          type: PaymentType.LOYER,
          status: PaymentStatus.SUCCESS,
          method: PaymentProvider.CASH,
          reference: `CASH-${Date.now()}-${schedule.id.slice(-4)}`,
          leaseId: schedule.leaseId,
          userId: schedule.lease.tenantId,
        }
      });

      // 3. Mise à jour de l'échéance
      await tx.rentSchedule.update({
        where: { id: schedule.id },
        data: {
          status: RentStatus.PAID,
          paidAt: new Date(),
          paymentId: payment.id
        }
      });

      // 4. Préparation des données pour le générateur PDF front-end
      return {
        receiptNumber: payment.reference!,
        tenantName: schedule.lease.tenant.name || "Locataire",
        propertyName: schedule.lease.property.title,
        propertyAddress: `${schedule.lease.property.address}, ${schedule.lease.property.commune}`,
        amount: schedule.amount,
        period: schedule.expectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        agencyName: schedule.lease.agent?.agency?.name || "Agence Immobilière",
        datePaid: payment.date
      };
    }, { isolationLevel: "Serializable" });

    revalidatePath('/dashboard/agency/properties');

    return { success: true, data: result };

  } catch (error: any) {
    console.error("Erreur Cash Express:", error);
    return { success: false, message: error.message || "Erreur lors de l'encaissement." };
  }
}
