'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/lib/notifications"; 
import { logActivity } from "@/lib/logger"; // ✅ 1. IMPORT DU LOGGER

// =========================================================
// 1. SOUMISSION DU DOSSIER (Utilisateur)
// =========================================================
export async function submitKycApplication(documentUrl: string, idType: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return { error: "Vous devez être connecté." };
    }

    // Mise à jour ou Création (Upsert)
    await prisma.userKYC.upsert({
      where: { userId: userId },
      update: {
        status: "PENDING",
        documents: [documentUrl],
        idType: idType,
        updatedAt: new Date(),
        rejectionReason: null 
      },
      create: {
        userId: userId,
        status: "PENDING",
        documents: [documentUrl],
        idType: idType
      }
    });

    revalidatePath("/dashboard/tenant");
    revalidatePath("/dashboard/owner");
    return { success: true };

  } catch (error) {
    console.error("Erreur KYC:", error);
    return { error: "Erreur serveur lors de l'enregistrement." };
  }
}

// =========================================================
// 2. EXAMEN DU DOSSIER (SuperAdmin)
// =========================================================
export async function reviewKyc(kycId: string, decision: "VERIFIED" | "REJECTED", reason?: string) {
  try {
    const session = await auth();
    
    // Vérification stricte du rôle via DB
    if (!session?.user?.id) return { error: "Non autorisé" };
    
    const adminUser = await prisma.user.findUnique({ 
        where: { id: session.user.id },
        select: { role: true }
    });

    if (adminUser?.role !== "SUPER_ADMIN") {
        return { error: "Action réservée aux administrateurs." };
    }

    // 1. Mise à jour de la table UserKYC
    const updatedKyc = await prisma.userKYC.update({
      where: { id: kycId },
      data: {
        status: decision,
        rejectionReason: decision === "REJECTED" ? reason : null,
        reviewedAt: new Date(),
        reviewedBy: session.user.id
      }
    });

    // 2. Logique Métier + NOTIFICATIONS 🔔 + AUDIT LOG 📝
    if (decision === "VERIFIED") {
        // A. Update User Global
        await prisma.user.update({
            where: { id: updatedKyc.userId },
            data: { isVerified: true }
        });

        // B. Audit Log (Preuve de validation)
        await logActivity({
            action: "KYC_VALIDATED",
            entityId: updatedKyc.userId,
            entityType: "USER",
            userId: session.user.id, // L'admin responsable
            metadata: { 
                reviewer: session.user.id,
                timestamp: new Date()
            }
        });

        // C. Notification de Succès
        await sendNotification({
            userId: updatedKyc.userId,
            title: "Identité Validée ✅",
            message: "Félicitations ! Votre dossier est validé. Vous avez maintenant accès complet à la plateforme.",
            type: "SUCCESS",
            link: "/dashboard"
        });

    } else {
        // A. Update User Global (Sécurité)
        await prisma.user.update({
            where: { id: updatedKyc.userId },
            data: { isVerified: false }
        });

        // B. Audit Log (Trace du rejet)
        await logActivity({
            action: "KYC_REJECTED",
            entityId: updatedKyc.userId,
            entityType: "USER",
            userId: session.user.id, // L'admin responsable
            metadata: { 
                reason: reason,
                reviewer: session.user.id
            }
        });

        // C. Notification de Rejet
        await sendNotification({
            userId: updatedKyc.userId,
            title: "Action Requise : Dossier Rejeté 🛑",
            message: `Votre pièce d'identité a été refusée. Motif : ${reason || "Non spécifié"}. Veuillez soumettre un nouveau document.`,
            type: "ERROR",
            link: "/dashboard/tenant/kyc"
        });
    }

    revalidatePath("/dashboard/superadmin/kyc");
    return { success: decision === "VERIFIED" ? "Validé" : "Rejeté" };

  } catch (error) {
    console.error("Erreur Review KYC:", error);
    return { error: "Erreur lors de la validation." };
  }
}

// =========================================================
// 3. POLLING TEMPS RÉEL (La Magie ✨)
// =========================================================
export async function getLiveKycStatus() {
  const session = await auth();
  if (!session || !session.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isVerified: true,
      kyc: {
        select: {
          status: true,
          rejectionReason: true
        }
      }
    }
  });

  if (!user) return null;

  return {
    status: user.kyc?.status || "NONE",
    rejectionReason: user.kyc?.rejectionReason || null,
    isVerified: user.isVerified
  };
}
