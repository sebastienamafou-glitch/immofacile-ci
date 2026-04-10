"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ============================================================================
// 1. LOCATAIRE : SOUMISSION DU PRÉAVIS
// ============================================================================
export async function giveNoticeAction(leaseId: string, departureDate: Date, tenantId: string) {
  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: { select: { ownerId: true, title: true } },
        tenant: { select: { name: true } }
      }
    });

    if (!lease || lease.tenantId !== tenantId) {
      throw new Error("Action non autorisée.");
    }

    if (lease.status !== "ACTIVE") {
      throw new Error("Le bail n'est pas actif.");
    }

    // Clôture du bail
    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        status: "TERMINATED",
        isActive: false, // ✅ OBLIGATOIRE : Désactivation stricte du bail
        endDate: new Date(),
      }
    });
    await prisma.auditLog.create({
      data: {
        action: "NOTICE_GIVEN",
        entityId: leaseId,
        entityType: "LEASE",
        userId: tenantId,
        metadata: { departureDate }
      }
    });

    await prisma.notification.create({
      data: {
        userId: lease.property.ownerId,
        title: "Préavis de départ reçu 🚨",
        message: `Votre locataire ${lease.tenant.name || 'du bien'} a donné son préavis pour le bien "${lease.property.title}". Départ prévu : ${departureDate.toLocaleDateString('fr-FR')}.`,
        type: "ALERT",
        link: `/dashboard/owner/leases/${leaseId}`
      }
    });

    revalidatePath("/dashboard/tenant");
    revalidatePath(`/dashboard/tenant/contract/${leaseId}`);
    revalidatePath("/dashboard/owner");

    return { success: true, lease: updatedLease };

  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}

// ============================================================================
// 2. PROPRIÉTAIRE / AGENCE : VALIDATION DU DÉPART ET LIBÉRATION DU BIEN
// ============================================================================
export async function acknowledgeNoticeAction(leaseId: string, ownerId: string) {
  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { property: true }
    });

    if (!lease || lease.property.ownerId !== ownerId) {
      throw new Error("Action non autorisée.");
    }

    if (lease.status !== "IN_NOTICE") {
      throw new Error("Ce bail n'est pas en période de préavis.");
    }

    // Clôture du bail
    const updatedLease = await prisma.lease.update({
      where: { id: leaseId },
      data: {
        status: "TERMINATED",
        endDate: new Date(),
      }
    });

    // Remise sur le marché du bien
    await prisma.property.update({
      where: { id: lease.propertyId },
      data: { isAvailable: true }
    });

    await prisma.auditLog.create({
      data: {
        action: "NOTICE_ACKNOWLEDGED",
        entityId: leaseId,
        entityType: "LEASE",
        userId: ownerId,
      }
    });

    await prisma.notification.create({
      data: {
        userId: lease.tenantId,
        title: "Préavis validé ✅",
        message: `Votre préavis pour le bien "${lease.property.title}" a été pris en compte par le propriétaire.`,
        type: "INFO",
        link: `/dashboard/tenant/contract/${leaseId}`
      }
    });

    revalidatePath("/dashboard/owner");
    revalidatePath(`/dashboard/owner/leases/${leaseId}`);

    return { success: true, lease: updatedLease };

  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}

// ============================================================================
// 3. PROPRIÉTAIRE : RESTITUTION DE LA CAUTION (DEPUIS LE WALLET)
// ============================================================================
export async function refundDepositAction(leaseId: string, deductions: number, ownerId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const lease = await tx.lease.findUnique({
        where: { id: leaseId },
        include: { property: true, tenant: true }
      });

      if (!lease || lease.property.ownerId !== ownerId) {
        throw new Error("Action non autorisée.");
      }

      if (deductions < 0 || deductions > lease.depositAmount) {
        throw new Error("Le montant des retenues est invalide.");
      }

      const refundAmount = lease.depositAmount - deductions;

      // 1. Débiter le propriétaire via UserFinance
      const ownerFinance = await tx.userFinance.findUnique({ where: { userId: ownerId } });
      if (!ownerFinance || ownerFinance.walletBalance < refundAmount) {
         throw new Error("Solde insuffisant sur votre portefeuille pour restituer la caution.");
      }

      await tx.userFinance.update({
        where: { userId: ownerId },
        data: { walletBalance: { decrement: refundAmount } }
      });

      // 2. Créditer le portefeuille du locataire via UserFinance
      await tx.userFinance.update({
        where: { userId: lease.tenantId },
        data: { walletBalance: { increment: refundAmount } }
      });

      // 3. Traçabilité : Transaction Propriétaire (Débit)
      await tx.transaction.create({
        data: {
          amount: refundAmount,
          type: "DEBIT",
          balanceType: "WALLET",
          status: "SUCCESS",
          reason: deductions > 0 
            ? `Restitution caution (Retenue: ${deductions}F) - ${lease.property.title}`
            : `Restitution intégrale caution - ${lease.property.title}`,
          userId: ownerId,
          reference: `REFUND-OUT-${leaseId.substring(0,8)}`,
          previousHash: "GENESIS"
        }
      });

      // 4. Traçabilité : Transaction Locataire (Crédit)
      await tx.transaction.create({
        data: {
          amount: refundAmount,
          type: "CREDIT",
          balanceType: "WALLET",
          status: "SUCCESS",
          reason: `Remboursement caution suite au départ - ${lease.property.title}`,
          userId: lease.tenantId,
          reference: `REFUND-IN-${leaseId.substring(0,8)}`,
          previousHash: "GENESIS"
        }
      });

      // 5. Historique d'Audit
      await tx.auditLog.create({
        data: {
          action: "DEPOSIT_REFUNDED",
          entityId: leaseId,
          entityType: "LEASE",
          userId: ownerId,
          metadata: { depositAmount: lease.depositAmount, deductions, refundAmount }
        }
      });

      // 6. Notification du locataire
      await tx.notification.create({
        data: {
          userId: lease.tenantId,
          title: "Caution restituée 💰",
          message: `Votre caution de ${refundAmount.toLocaleString()} FCFA a été créditée sur votre portefeuille.`,
          type: "SUCCESS",
          link: `/dashboard/tenant/wallet`
        }
      });

      return { success: true };
    });

  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}

// ============================================================================
// 4. LOCATAIRE : PAIEMENT D'UNE ÉCHÉANCE DE LOYER
// ============================================================================
export async function payRentAction(scheduleId: string, tenantId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Vérification de l'échéance
      const schedule = await tx.rentSchedule.findUnique({
        where: { id: scheduleId },
        include: { lease: { include: { property: true } } }
      });

      if (!schedule || schedule.lease.tenantId !== tenantId) {
        throw new Error("Échéance introuvable ou action non autorisée.");
      }
      if (schedule.status === "PAID") {
        throw new Error("Cette échéance est déjà payée.");
      }

      const amountToPay = schedule.amount;
      const ownerId = schedule.lease.property.ownerId;

      // 2. Vérification du solde du locataire (Ciblage de UserFinance)
      const tenantFinance = await tx.userFinance.findUnique({ 
        where: { userId: tenantId } 
      });
      
      if (!tenantFinance || tenantFinance.walletBalance < amountToPay) {
         throw new Error("Solde insuffisant sur votre portefeuille. Veuillez le recharger.");
      }

      // 3. Mouvements financiers (Débit Locataire / Crédit Propriétaire via UserFinance)
      await tx.userFinance.update({
        where: { userId: tenantId },
        data: { walletBalance: { decrement: amountToPay } }
      });

      // Attention : on s'assure que le propriétaire a bien une entrée UserFinance
      // Si on veut être ultra-résilient, un upsert serait l'idéal, mais un update suffit si on part 
      // du principe que chaque utilisateur a son wallet créé à l'inscription.
      await tx.userFinance.update({
        where: { userId: ownerId },
        data: { walletBalance: { increment: amountToPay } }
      });

      // 4. Mise à jour du statut de l'échéance
      const updatedSchedule = await tx.rentSchedule.update({
        where: { id: scheduleId },
        data: { 
          status: "PAID",
          paidAt: new Date()
        }
      });

      // 5. Traçabilité (Transactions)
      await tx.transaction.create({
        data: {
          amount: amountToPay,
          type: "DEBIT",
          balanceType: "WALLET",
          status: "SUCCESS",
          reason: `Paiement loyer échéance - ${schedule.lease.property.title}`,
          userId: tenantId,
          reference: `RENT-OUT-${scheduleId.substring(0,8)}`,
          previousHash: "GENESIS"
        }
      });

      await tx.transaction.create({
        data: {
          amount: amountToPay,
          type: "CREDIT",
          balanceType: "WALLET",
          status: "SUCCESS",
          reason: `Réception loyer - ${schedule.lease.property.title}`,
          userId: ownerId,
          reference: `RENT-IN-${scheduleId.substring(0,8)}`,
          previousHash: "GENESIS"
        }
      });

      // 6. Notification au propriétaire
      await tx.notification.create({
        data: {
          userId: ownerId,
          title: "Nouveau loyer reçu 💰",
          message: `Le loyer de ${amountToPay.toLocaleString()} FCFA pour "${schedule.lease.property.title}" a été payé et crédité sur votre portefeuille.`,
          type: "SUCCESS",
          link: `/dashboard/owner/leases/${schedule.lease.id}`
        }
      });

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
          action: "PAYMENT_SUCCESS",
          entityId: scheduleId,
          entityType: "RENT_SCHEDULE",
          userId: tenantId,
        }
      });

      return { success: true, schedule: updatedSchedule };
    });
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du paiement." };
  }
}
