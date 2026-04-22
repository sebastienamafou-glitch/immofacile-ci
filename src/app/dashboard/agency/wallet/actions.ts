'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendRentReminderEmail } from "@/lib/mail";
import { sendNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

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
