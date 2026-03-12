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

      // 1. Débiter le propriétaire (ou l'agence selon qui détient les fonds)
      // Note : On suppose que les fonds sont sur le wallet du propriétaire
      const owner = await tx.user.findUnique({ where: { id: ownerId } });
      if (!owner || owner.walletBalance < refundAmount) {
         throw new Error("Solde insuffisant sur votre portefeuille pour restituer la caution.");
      }

      await tx.user.update({
        where: { id: ownerId },
        data: { walletBalance: { decrement: refundAmount } }
      });

      // 2. Créditer le portefeuille du locataire
      await tx.user.update({
        where: { id: lease.tenantId },
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
