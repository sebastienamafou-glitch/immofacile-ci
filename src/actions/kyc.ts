'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/lib/notifications"; 
import { logActivity } from "@/lib/logger"; 
import { encrypt } from "@/lib/crypto"; 
import { VerificationStatus, Role } from "@prisma/client";

// =========================================================
// 1. SOUMISSION DU DOSSIER (Utilisateur)
// =========================================================
export async function submitKycApplication(
  documentUrl: string, 
  idType: string, 
  idNumber: string // ✅ 2. AJOUT DU PARAMÈTRE MANQUANT
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return { error: "Vous devez être connecté." };
    }

    // ✅ CHIFFREMENT DE LA DONNÉE SENSIBLE AVANT INSERTION
    const secureIdNumber = encrypt(idNumber);

    // Mise à jour ou Création (Upsert)
    await prisma.userKYC.upsert({
      where: { userId: userId },
      update: {
        status: VerificationStatus.PENDING, // ✅ ENUM STRICT
        documents: [documentUrl],
        idType: idType,
        idNumber: secureIdNumber, // ✅ SAUVEGARDE SÉCURISÉE EN BDD
        updatedAt: new Date(),
        rejectionReason: null 
      },
      create: {
        userId: userId,
        status: VerificationStatus.PENDING, // ✅ ENUM STRICT
        documents: [documentUrl],
        idType: idType,
        idNumber: secureIdNumber // ✅ SAUVEGARDE SÉCURISÉE EN BDD
      }
    });

    revalidatePath("/dashboard/tenant");
    revalidatePath("/dashboard/owner");
    revalidatePath("/dashboard/artisan"); // ✅ Ajout pour l'artisan
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

    if (adminUser?.role !== Role.SUPER_ADMIN) { // ✅ ENUM STRICT
        return { error: "Action réservée aux administrateurs." };
    }

    const finalStatus = decision === "VERIFIED" ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    // 1. Mise à jour de la table UserKYC
    const updatedKyc = await prisma.userKYC.update({
      where: { id: kycId },
      data: {
        status: finalStatus, // ✅ ENUM STRICT
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
            link: "/dashboard/kyc"
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
// 3. POLLING TEMPS RÉEL
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
