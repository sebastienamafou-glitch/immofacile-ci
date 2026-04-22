"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function processMandateAction(mandateId: string, action: "ACCEPT" | "REFUSE") {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Non autorisé");
    const userId = session.user.id;

    // 1. Vérification de sécurité stricte
    const mandate = await prisma.managementMandate.findUnique({
      where: { id: mandateId },
      include: { property: true }
    });

    if (!mandate || mandate.agencyId !== userId) throw new Error("Mandat introuvable ou accès refusé");
    if (mandate.status !== "PENDING") throw new Error("Ce mandat a déjà été traité");

    // 2. Traitement selon l'action
    if (action === "ACCEPT") {
      await prisma.managementMandate.update({
        where: { id: mandateId },
        data: { status: "ACTIVE", signatureStatus: "COMPLETED" } 
      });

      await sendNotification({
        userId: mandate.ownerId,
        title: "Mandat accepté ! 🎉",
        message: `L'agence a accepté de gérer votre bien "${mandate.property.title}".`,
        type: "SUCCESS",
        link: `/dashboard/owner/properties/${mandate.propertyId}`
      });

    } else if (action === "REFUSE") {
      // En cas de refus, on annule le mandat ET on retire l'agence de la propriété
      await prisma.$transaction([
        prisma.managementMandate.update({
          where: { id: mandateId },
          data: { status: "TERMINATED", signatureStatus: "PENDING" }
        }),
        prisma.property.update({
          where: { id: mandate.propertyId },
          data: { agencyId: null }
        })
      ]);

      await sendNotification({
        userId: mandate.ownerId,
        title: "Mandat refusé",
        message: `L'agence a décliné la gestion de votre bien "${mandate.property.title}".`,
        type: "WARNING",
        link: `/dashboard/owner/properties/${mandate.propertyId}`
      });
    }

    // 3. Rafraîchir la page côté serveur
    revalidatePath("/dashboard/agency/mandates");
    return { success: true };

  } catch (error: unknown) {
    console.error("Erreur Traitement Mandat:", error);
    return { success: false, error: (error as Error).message || "Erreur serveur" };
  }
}
