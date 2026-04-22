'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logger";
import { AuditAction } from "@prisma/client"; 
import { encrypt } from "@/lib/crypto";


// ✅ CORRECTION : On ajoute idNumber en argument optionnel
export async function submitKycApplication(documentUrl: string, idType: string, idNumber?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return { error: "Vous devez être connecté." };
    }

    // 🛡️ CHIFFREMENT
    const encryptedIdNumber = idNumber ? encrypt(idNumber) : undefined;

    // Mise à jour en base de données
    await prisma.userKYC.upsert({
      where: { userId: userId },
      update: {
        status: "PENDING",
        documents: [documentUrl],
        idType: idType,
        // Si un numéro est fourni, on le met à jour (chiffré), sinon on ne touche pas
        ...(encryptedIdNumber && { idNumber: encryptedIdNumber }),
        updatedAt: new Date(),
        rejectionReason: null 
      },
      create: {
        userId: userId,
        status: "PENDING",
        documents: [documentUrl],
        idType: idType,
        idNumber: encryptedIdNumber || null // ✅ Création sécurisée
      }
    });

    // Log de sécurité (On ne logue PAS le numéro, même chiffré)
    await logActivity({
        action: AuditAction.SECURITY_ALERT, // Fallback (KYC_SUBMITTED n'existe pas dans l'Enum)
        entityType: "USER",
        entityId: userId,
        metadata: { method: "CLOUDINARY", docType: idType },
        userId: userId
    });

    revalidatePath("/dashboard/tenant");
    return { success: true };

  } catch (error) {
    console.error("Erreur KYC:", error);
    return { error: "Erreur serveur lors de l'enregistrement." };
  }
}

// La fonction reviewKyc reste inchangée (elle ne manipule pas le idNumber en écriture)
export async function reviewKyc(kycId: string, decision: "VERIFIED" | "REJECTED", reason?: string) {
    // ... (Gardez votre code reviewKyc existant ici, il est correct) ...
    const session = await auth();
  
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
