'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendRentReminderEmail } from "@/lib/mail";
import { sendNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { PaymentProvider, PaymentStatus, PaymentType, RentStatus } from "@prisma/client";

export async function sendManualRentReminderAction(scheduleId: string) {
  const session = await auth();
  const agencyId = session?.user?.agencyId;
  const agentId = session?.user?.id;

  if (!agencyId || !agentId) {
    return { error: "Accès non autorisé." };
  }

  try {
    // 1. Récupération de l'échéance et vérification des droits
    const schedule = await prisma.rentSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        lease: {
          include: { 
              property: true, 
              tenant: true 
          }
        }
      }
    });

    if (!schedule) return { error: "Échéance introuvable." };
    if (schedule.lease.property.agencyId !== agencyId) {
        return { error: "Ce bien n'est pas sous votre gestion." };
    }
    if (schedule.status === "PAID") {
        return { error: "Ce loyer a déjà été payé." };
    }

    const tenant = schedule.lease.tenant;

    // 2. Notification In-App
    await sendNotification({
        userId: tenant.id,
        title: "⚠️ Relance de Loyer",
        message: `Votre agence vous rappelle que votre loyer de ${schedule.amount.toLocaleString()} FCFA est en attente de paiement.`,
        type: "WARNING",
        link: `/dashboard/tenant/contract/${schedule.lease.id}`
    });

    // 3. Envoi de l'Email (si le locataire en a un)
    let emailSent = false;
    if (tenant.email) {
        const mailResult = await sendRentReminderEmail(
            tenant.email, 
            tenant.name || "Locataire", 
            schedule.amount, 
            schedule.lease.property.title, 
            schedule.expectedDate
        );
        emailSent = mailResult.success;
    }

    // 4. Traçabilité (AuditLog)
    await prisma.auditLog.create({
        data: {
            action: "PROPERTY_UPDATED", // Fallback sur un enum existant
            entityId: schedule.id,
            entityType: "RENT_SCHEDULE",
            userId: agentId,
            metadata: { 
                actionOrigin: "MANUAL_RENT_REMINDER", 
                amount: schedule.amount,
                emailSent: emailSent
            }
        }
    });

    revalidatePath('/dashboard/agency/wallet');
    return { 
        success: true, 
        message: emailSent 
            ? "Relance envoyée avec succès par email et notification." 
            : "Locataire notifié sur son application (pas d'email disponible)." 
    };

  } catch (error) {
    console.error("Erreur relance manuelle:", error);
    return { error: "Erreur technique lors de la relance." };
  }
}
export async function processCashPaymentAction(scheduleId: string) {
  const session = await auth();
  const agencyId = session?.user?.agencyId;

  if (!session?.user?.id || !agencyId) {
    return { success: false, message: "Accès non autorisé." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupération stricte de l'échéance avec relations pour le reçu
      const schedule = await tx.rentSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          lease: {
            include: {
              tenant: true,
              property: { include: { agency: true } }
            }
          }
        }
      });

      if (!schedule) throw new Error("Échéance introuvable.");
      if (schedule.status === RentStatus.PAID) throw new Error("Ce loyer est déjà payé.");
      if (schedule.lease.property.agencyId !== agencyId) throw new Error("Ce bien n'appartient pas à votre agence.");

      const receiptRef = `CASH-${Date.now()}-${schedule.id.slice(-4)}`.toUpperCase();

      // 2. Création du Paiement CASH (sans commission de plateforme)
      const payment = await tx.payment.create({
        data: {
          amount: schedule.amount,
          type: PaymentType.LOYER,
          status: PaymentStatus.SUCCESS,
          method: PaymentProvider.CASH,
          reference: receiptRef,
          leaseId: schedule.leaseId,
          userId: schedule.lease.tenantId,
          // La commission d'agence est conservée en interne sur les paiements Cash
          amountAgency: Math.round(schedule.amount * (schedule.lease.agencyCommissionRate || 0.10)),
          amountOwner: Math.round(schedule.amount * (1 - (schedule.lease.agencyCommissionRate || 0.10))),
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

      // 4. Création de l'Audit Log (Comptabilité)
      await tx.agencyTransaction.create({
          data: {
              amount: schedule.amount,
              type: "CREDIT",
              reason: `Encaissement Cash - ${schedule.lease.property.title}`,
              status: "SUCCESS",
              agencyId: agencyId,
          }
      });

      // 5. Préparation de la payload pour le générateur PDF front-end
      const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
      const periodLabel = `${monthNames[schedule.expectedDate.getMonth()]} ${schedule.expectedDate.getFullYear()}`;

      return {
        receiptNumber: receiptRef,
        tenantName: schedule.lease.tenant.name || "Locataire Inconnu",
        propertyName: schedule.lease.property.title,
        propertyAddress: `${schedule.lease.property.address}, ${schedule.lease.property.commune}`,
        amount: schedule.amount,
        period: periodLabel,
        agencyName: schedule.lease.property.agency?.name || "Agence Immobilière",
        datePaid: payment.date
      };
    }, { isolationLevel: "Serializable" });

    // On rafraîchit le tableau de bord financier
    revalidatePath('/dashboard/agency/wallet');

    return { success: true, data: result };

  } catch (error: unknown) {
    console.error("Erreur Cash Express:", error);
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "Erreur technique lors de l'encaissement." };
  }
}
