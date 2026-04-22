import { describe, it, expect } from 'vitest';
import { calculateInitialLeaseFees } from '@/features/leases/services/leaseCalculator';

describe('Service : Calculateur Financier des Baux', () => {
  
  it('doit calculer correctement les frais initiaux pour la Villa Emeraude (Test Seed)', () => {
    // Arrange (Préparation des données)
    const financials = {
      monthlyRent: 1500000,
      depositMonths: 2, // 3 000 000
      advanceMonths: 1, // 1 500 000
      agencyCommissionRate: 0.10,
    };

    // Act (Exécution)
    const result = calculateInitialLeaseFees(financials);

    // Assert (Vérification)
    expect(result.depositAmount).toBe(3000000);
    expect(result.advanceAmount).toBe(1500000);
    expect(result.tenantLeasingFee).toBe(750000); // La moitié d'un mois de loyer
    expect(result.totalToPay).toBe(5250000);
  });

  it('doit renvoyer 0 si le loyer est de 0', () => {
    const result = calculateInitialLeaseFees({
      monthlyRent: 0,
      depositMonths: 2,
      advanceMonths: 1,
      agencyCommissionRate: 0.10,
    });
    expect(result.totalToPay).toBe(0);
  });
});
