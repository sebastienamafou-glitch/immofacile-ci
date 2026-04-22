import { describe, it, expect } from 'vitest';
import { createInvestmentContract } from '@/features/invest/services/investmentService';
import { prismaMock } from '../setup/vitest.setup'; 

// ✅ CORRECTION : On importe les types stricts générés par Prisma
import { InvestmentContract, InvestmentPack, InvestmentStatus, Prisma } from '@prisma/client';

describe('Service : Investissement (Prisma Mock)', () => {
  
  it('doit créer un contrat PENDING et appeler Prisma correctement', async () => {
    
    // ✅ CORRECTION : On type explicitement notre objet
    const mockContract: InvestmentContract = {
      id: 'cmo90gtxh001',
      userId: 'user-123',
      packName: InvestmentPack.PREMIUM, // Enum strict
      amount: 10000000,
      ipAddress: '192.168.1.1',
      signatureData: 'pending_signature',
      status: InvestmentStatus.PENDING, // Enum strict
      signedAt: new Date(),
      userAgent: null,
      paymentReference: null,
      roi: new Prisma.Decimal(0), // ✅ La subtilité est ici : on instancie un Prisma.Decimal
      contractUrl: null
    };

    // Plus aucun `any` ou `ts-expect-error`. Le compilateur est satisfait à 100%.
    prismaMock.investmentContract.create.mockResolvedValue(mockContract); 

    // 2. Act : On exécute notre service
    const result = await createInvestmentContract('user-123', InvestmentPack.PREMIUM, 10000000, '192.168.1.1');

    // 3. Assert : On vérifie le comportement
    expect(prismaMock.investmentContract.create).toHaveBeenCalledTimes(1);
    
    expect(prismaMock.investmentContract.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        packName: InvestmentPack.PREMIUM,
        amount: 10000000,
        ipAddress: '192.168.1.1',
        signatureData: 'pending_signature',
        status: InvestmentStatus.PENDING
      }
    });

    expect(result.id).toBe('cmo90gtxh001');
    expect(result.status).toBe(InvestmentStatus.PENDING);
  });

  it('doit rejeter un investissement inférieur au minimum légal', async () => {
    await expect(
      createInvestmentContract('user-123', InvestmentPack.STARTER, 50000, '192.168.1.1')
    ).rejects.toThrow("Le montant minimum d'investissement est de 100 000 FCFA.");
    
    expect(prismaMock.investmentContract.create).not.toHaveBeenCalled();
  });

});
