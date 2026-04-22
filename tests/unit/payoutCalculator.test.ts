import { describe, it, expect } from 'vitest';
import { calculateBookingPayout } from '@/features/akwaba/services/payoutCalculator';

describe('Service : Répartition des Revenus Akwaba (Payout Calculator)', () => {

  it('doit calculer correctement le Payout de Sophie (Test Seed)', () => {
    // Arrange : Séjour de 175 000 FCFA avec 10% de frais Babimmo (Seed)
    const totalAmount = 175000;

    // Act
    const result = calculateBookingPayout(totalAmount, 0.10, 0);

    // Assert
    expect(result.platformCommission).toBe(17500); // 10% pour la plateforme
    expect(result.agencyCommission).toBe(0);       // Pas d'agence impliquée
    expect(result.hostPayout).toBe(157500);        // L'hôte reçoit bien les 90% restants
    expect(result.totalAmount).toBe(175000);
  });

  it('doit répartir correctement si une agence tierce est impliquée', () => {
    // Arrange : 100 000 FCFA, 10% Babimmo, 8% Agence
    const result = calculateBookingPayout(100000, 0.10, 0.08);

    // Assert
    expect(result.platformCommission).toBe(10000);
    expect(result.agencyCommission).toBe(8000);
    expect(result.hostPayout).toBe(82000);
  });

  it('doit empêcher la saisie de montants négatifs (Anti-Fraude)', () => {
    // Act & Assert
    expect(() => calculateBookingPayout(-5000)).toThrow("Le montant d'une réservation ne peut pas être négatif.");
  });

  it('doit gérer les arrondis monétaires sans perte de valeur', () => {
    // Arrange : Un montant qui génère des virgules avec 10% (ex: 33 333 * 0.10 = 3333.3)
    const result = calculateBookingPayout(33333, 0.10, 0);

    // Assert : La somme des parties doit toujours être strictement égale au total initial
    expect(result.platformCommission).toBe(3333); // Arrondi de 3333.3
    expect(result.hostPayout).toBe(30000);        // Le reste exact
    expect(result.platformCommission + result.agencyCommission + result.hostPayout).toBe(33333);
  });

});
