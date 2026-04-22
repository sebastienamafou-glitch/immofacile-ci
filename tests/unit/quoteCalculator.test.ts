import { describe, it, expect } from 'vitest';
import { calculateQuoteTotals } from '@/features/maintenance/services/quoteCalculator';
import { Prisma } from '@prisma/client';

describe('Service : Moteur de Facturation Artisan (Quote Calculator)', () => {

  it('doit calculer correctement le HT, la TVA et le TTC', () => {
    // Arrange : Un devis avec une robinetterie et un tuyau
    const items = [
      { quantity: 2, unitPrice: new Prisma.Decimal(15000) },      // 30 000 FCFA
      { quantity: 1, unitPrice: new Prisma.Decimal(50000.50) }   // 50 000.50 FCFA
    ];
    // Sous-total attendu : 80 000.50 FCFA
    const taxRate = new Prisma.Decimal(18); // 18% de TVA

    // Act
    const result = calculateQuoteTotals(items, taxRate);

    // Assert : On repasse en .toNumber() pour faciliter l'assertion Jest/Vitest
    // 80000.50 * 0.18 = 14400.09
    // Total TTC = 94400.59
    expect(result.subTotal.toNumber()).toBe(80000.5);
    expect(result.taxAmount.toNumber()).toBe(14400.09);
    expect(result.totalAmount.toNumber()).toBe(94400.59);
  });

  it('doit renvoyer 0 si le devis ne contient aucun article', () => {
    const result = calculateQuoteTotals([], new Prisma.Decimal(18));

    expect(result.subTotal.toNumber()).toBe(0);
    expect(result.taxAmount.toNumber()).toBe(0);
    expect(result.totalAmount.toNumber()).toBe(0);
  });

  it('ne doit pas perdre de précision sur des calculs flottants complexes', () => {
    // Ce test prouve pourquoi on utilise Prisma.Decimal.
    // En JS natif : 0.1 + 0.2 = 0.30000000000000004
    const items = [
      { quantity: 1, unitPrice: new Prisma.Decimal(0.1) },
      { quantity: 1, unitPrice: new Prisma.Decimal(0.2) }
    ];
    const result = calculateQuoteTotals(items, new Prisma.Decimal(0));

    // Avec Prisma.Decimal, le résultat reste strictement 0.3
    expect(result.totalAmount.toNumber()).toBe(0.3);
  });

});
