import { prisma } from '@/lib/prisma';
import { VerificationStatus } from '@prisma/client';

export const ensureKycVerified = async (userId: string): Promise<boolean> => {
  // On ne récupère que le statut pour optimiser la requête SQL
  const userKyc = await prisma.userKYC.findUnique({
    where: { userId: userId },
    select: { status: true }
  });

  if (!userKyc) {
    throw new Error("Accès refusé : Aucun dossier KYC trouvé pour cet utilisateur. Veuillez soumettre vos documents.");
  }

  if (userKyc.status === VerificationStatus.PENDING) {
    throw new Error("Accès refusé : Vos documents sont en cours de vérification par notre équipe.");
  }

  if (userKyc.status === VerificationStatus.REJECTED) {
    throw new Error("Accès refusé : Vos documents ont été rejetés. Veuillez les soumettre à nouveau.");
  }

  if (userKyc.status !== VerificationStatus.VERIFIED) {
    throw new Error("Accès refusé : Statut KYC invalide.");
  }

  return true;
};
