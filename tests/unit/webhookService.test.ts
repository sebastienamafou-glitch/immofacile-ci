import { describe, it, expect, beforeEach } from 'vitest';
import { processPaymentWebhook } from '@/features/finance/services/webhookService';
import { prismaMock } from '../setup/vitest.setup';
import { PaymentStatus, Prisma, ProcessedWebhook, Payment } from '@prisma/client';

describe('Service : Idempotence des Webhooks (FinTech Core)', () => {

  beforeEach(() => {
    // On ignore l'erreur stricte sur la transaction pour le mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock as any));
  });

  it('doit traiter un nouveau webhook de paiement avec succès', async () => {
    
    // ✅ CORRECTION : On utilise les vrais types de ton schéma
    const mockWebhook: ProcessedWebhook = {
      id: 'cinetpay_evt_999',
      processedAt: new Date(),
    };

    const mockPayment = {
      id: 'pay_123',
      status: PaymentStatus.SUCCESS,
    } as Payment; // Cast partiel propre pour éviter de remplir les 20 champs du modèle Payment

    // Les mocks sont maintenant parfaitement acceptés par TypeScript
    prismaMock.processedWebhook.create.mockResolvedValue(mockWebhook);
    prismaMock.payment.update.mockResolvedValue(mockPayment);

    // Act
    const result = await processPaymentWebhook('cinetpay_evt_999', 'pay_123');

    // Assert
    expect(result.success).toBe(true);
    expect(prismaMock.processedWebhook.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.payment.update).toHaveBeenCalledTimes(1);
  });

  it('doit rejeter un doublon exact sans modifier le paiement (Erreur Prisma P2002)', async () => {
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`id`)',
      { code: 'P2002', clientVersion: '5.x' }
    );
    
    prismaMock.processedWebhook.create.mockRejectedValue(duplicateError);

    const result = await processPaymentWebhook('cinetpay_evt_999', 'pay_123');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Doublon intercepté');
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  });

  it('doit laisser remonter les vraies erreurs système', async () => {
    prismaMock.processedWebhook.create.mockRejectedValue(new Error("Database connection lost"));

    await expect(
      processPaymentWebhook('cinetpay_evt_999', 'pay_123')
    ).rejects.toThrow("Database connection lost");
  });

});
