'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ApplicationStatus } from "@prisma/client";

export async function updateApplicationStatusAction(applicationId: string, newStatus: ApplicationStatus) {
  const session = await auth();
  if (!session?.user?.agencyId) return { error: "Accès refusé" };

  try {
    // 1. Vérification de sécurité : Le dossier appartient-il bien à l'agence ?
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { property: { select: { agencyId: true, id: true } } }
    });

    if (!application || application.property.agencyId !== session.user.agencyId) {
      return { error: "Dossier introuvable ou non autorisé." };
    }

    // 2. Transaction pour mettre à jour le statut
    await prisma.$transaction(async (tx) => {
        // A. Mise à jour du dossier ciblé
        await tx.application.update({
            where: { id: applicationId },
            data: { status: newStatus }
        });

        // B. Si on ACCEPTE ce dossier, on REFUSE automatiquement les autres candidats en attente pour ce même bien
        if (newStatus === ApplicationStatus.ACCEPTED) {
            await tx.application.updateMany({
                where: { 
                    propertyId: application.property.id, 
                    id: { not: applicationId },
                    status: { in: [ApplicationStatus.PENDING, ApplicationStatus.REVIEWING] }
                },
                data: { status: ApplicationStatus.REJECTED }
            });
            
            // Optionnel : Créer une notification pour le candidat accepté
            await tx.notification.create({
                data: {
                    userId: application.applicantId,
                    title: "Dossier Accepté ! 🎉",
                    message: "Votre candidature a été retenue par l'agence. L'étape de signature du bail va bientôt commencer.",
                    type: "SUCCESS"
                }
            });
        }
    });

    revalidatePath(`/dashboard/agency/candidates/${applicationId}`);
    revalidatePath(`/dashboard/agency/candidates`);
    return { success: true };

  } catch (error) {
    console.error("Erreur updateApplicationStatusAction:", error);
    return { error: "Erreur lors de la mise à jour du dossier." };
  }
}
