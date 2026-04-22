import { describe, it, expect } from 'vitest';
import { ensureKycVerified } from '@/features/kyc/services/kycGuard';
import { prismaMock } from '../setup/vitest.setup';
import { UserKYC, VerificationStatus } from '@prisma/client';

describe('Service : Barrière KYC (Conformité Légale)', () => {

  it('doit autoriser l\'accès si le KYC est formellement VERIFIED', async () => {
    // Arrange : On crée un mock partiel mais strictement typé avec "as UserKYC"
    const mockKyc: Partial<UserKYC> = { status: VerificationStatus.VERIFIED };
    prismaMock.userKYC.findUnique.mockResolvedValue(mockKyc as UserKYC);

    // Act
    const isValid = await ensureKycVerified('user-123');

    // Assert
    expect(isValid).toBe(true);
    expect(prismaMock.userKYC.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.userKYC.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      select: { status: true }
    });
  });

  it('doit BLOQUER l\'accès si le KYC est en attente (PENDING)', async () => {
    const mockKyc: Partial<UserKYC> = { status: VerificationStatus.PENDING };
    prismaMock.userKYC.findUnique.mockResolvedValue(mockKyc as UserKYC);

    await expect(ensureKycVerified('user-123'))
      .rejects.toThrow("Accès refusé : Vos documents sont en cours de vérification par notre équipe.");
  });

  it('doit BLOQUER l\'accès si le KYC est rejeté (REJECTED)', async () => {
    const mockKyc: Partial<UserKYC> = { status: VerificationStatus.REJECTED };
    prismaMock.userKYC.findUnique.mockResolvedValue(mockKyc as UserKYC);

    await expect(ensureKycVerified('user-123'))
      .rejects.toThrow("Accès refusé : Vos documents ont été rejetés. Veuillez les soumettre à nouveau.");
  });

  it('doit BLOQUER l\'accès si l\'utilisateur n\'a aucun dossier KYC en base', async () => {
    // Arrange : Prisma renvoie null quand il ne trouve rien
    prismaMock.userKYC.findUnique.mockResolvedValue(null);

    await expect(ensureKycVerified('user-123'))
      .rejects.toThrow("Accès refusé : Aucun dossier KYC trouvé pour cet utilisateur.");
  });

});
