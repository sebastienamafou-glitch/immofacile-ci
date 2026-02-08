'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logger";

// ✅ CORRECTION 1 : On accepte bien 2 arguments (url + type)
export async function submitKycApplication(documentUrl: string, idType: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return { error: "Vous devez être connecté." };
    }

    // Mise à jour en base de données
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

    // Log de sécurité
    await logActivity(
        "KYC_SUBMITTED", 
        "SECURITY", 
        { method: "CLOUDINARY", docType: idType }, 
        userId
    );

    revalidatePath("/dashboard/tenant");
    return { success: true };

  } catch (error) {
    console.error("Erreur KYC:", error);
    return { error: "Erreur serveur lors de l'enregistrement." };
  }
}

// ✅ CORRECTION 2 : Gestion du rôle admin pour la validation
export async function reviewKyc(kycId: string, decision: "VERIFIED" | "REJECTED", reason?: string) {
  const session = await auth();
  
  // Astuce TypeScript : On force le typage ou on vérifie en DB si le rôle manque dans la session
  // Ici on fait une requête DB pour être sûr à 100% du rôle (plus sécurisé)
  if (!session?.user?.id) return { error: "Non autorisé" };
  
  const adminUser = await prisma.user.findUnique({ 
      where: { id: session.user.id },
      select: { role: true }
  });

  if (adminUser?.role !== "SUPER_ADMIN") {
      return { error: "Action réservée aux administrateurs." };
  }

  await prisma.userKYC.update({
    where: { id: kycId },
    data: {
      status: decision,
      rejectionReason: decision === "REJECTED" ? reason : null,
      reviewedAt: new Date(),
      reviewedBy: session.user.id
    }
  });

  if (decision === "VERIFIED") {
      const kyc = await prisma.userKYC.findUnique({ where: { id: kycId }});
      if (kyc) {
          await prisma.user.update({
              where: { id: kyc.userId },
              data: { isVerified: true }
          });
      }
  }

  revalidatePath("/admin/kyc");
  return { success: decision === "VERIFIED" ? "Validé" : "Rejeté" };
}
