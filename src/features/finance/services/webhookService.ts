import { prisma } from '@/lib/prisma';
import { PaymentStatus, Prisma } from '@prisma/client';

export const processPaymentWebhook = async (
  idempotencyKey: string,
  paymentId: string
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      
      // ✅ CORRECTION : On utilise 'id' comme clé unique, car c'est défini ainsi dans ton schéma
      await tx.processedWebhook.create({
        data: {
          id: idempotencyKey, 
        }
      });

      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.SUCCESS }
      });

      return { 
        success: true, 
        message: 'Paiement traité avec succès.', 
        payment: updatedPayment 
      };
    });

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { 
        success: false, 
        message: 'Doublon intercepté et ignoré : Ce webhook a déjà été traité.' 
      };
    }
    throw error;
  }
};
