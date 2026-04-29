'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { VerificationStatus } from '@prisma/client';
import { encrypt } from '@/lib/crypto'; // Ton module de chiffrement existant

export async function submitKycDocument(documentUrl: string, idType: string, idNumber: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autorisé');

  if (!idType || !idNumber || !documentUrl) {
    throw new Error('Données incomplètes');
  }

  // 🔒 Chiffrement du numéro de pièce avant insertion en base
  const encryptedIdNumber = encrypt(idNumber);

  // Upsert avec mise à jour du tableau "documents" et des nouvelles infos
  await prisma.userKYC.upsert({
    where: { userId: session.user.id },
    update: {
      documents: { push: documentUrl }, // Ajoute la nouvelle image à l'historique
      idType: idType,
      idNumber: encryptedIdNumber,
      status: VerificationStatus.PENDING,
      rejectionReason: null,
    },
    create: {
      userId: session.user.id,
      documents: [documentUrl], // Crée le tableau avec le premier document
      idType: idType,
      idNumber: encryptedIdNumber,
      status: VerificationStatus.PENDING,
    }
  });

  revalidatePath('/dashboard/kyc/verify');
}
