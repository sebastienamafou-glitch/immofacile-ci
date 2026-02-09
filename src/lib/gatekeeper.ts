import { prisma } from "@/lib/prisma";

/**
 * Vérifie si l'utilisateur est vérifié (KYC Validé).
 * Lance une erreur si ce n'est pas le cas.
 */
export async function requireKyc(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
        isVerified: true, 
        // ✅ CORRECTION : On accède à la relation 'kyc' pour avoir le statut détaillé
        kyc: {
            select: { status: true }
        }
    } 
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  // Le verrou : Si pas vérifié, on bloque
  if (!user.isVerified) {
    throw new Error("KYC_REQUIRED");
  }

  return true;
}
