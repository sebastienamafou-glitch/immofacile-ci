import { describe, it, expect } from 'vitest';
import { calculateMandatePayout } from '@/features/agency/services/mandateCalculator';

describe('Service : Moteur de Frais de Gestion (Mandate Calculator)', () => {

  it('doit calculer correctement les frais pour la Villa Emeraude (8% de gestion)', () => {
    // Arrange : Loyer de la Villa Emeraude = 1 500 000, Taux agence = 8%
    const collectedRent = 1500000;
    const commissionRate = 8.0;

    // Act
    const result = calculateMandatePayout(collectedRent, commissionRate);

    // Assert
    // 8% de 1 500 000 = 120 000 FCFA pour l'agence
    expect(result.agencyFee).toBe(120000); 
    // Le proprio touche 1 380 000 FCFA
    expect(result.ownerPayout).toBe(1380000); 
    expect(result.collectedRent).toBe(1500000);
  });

  it('doit gérer les décimales complexes dans le taux de commission', () => {
    // Arrange : Un taux de 8.5% sur un loyer de 333 333 FCFA
    const result = calculateMandatePayout(333333, 8.5);

    // Assert
    // 333 333 * 0.085 = 28333.305 (arrondi à 28 333)
    expect(result.agencyFee).toBe(28333);
    expect(result.ownerPayout).toBe(305000);
    // Tolérance Zéro : La somme doit toujours être égale au loyer initial
    expect(result.agencyFee + result.ownerPayout).toBe(333333);
  });

  it('doit empêcher la saisie de taux absurdes', () => {
    expect(() => calculateMandatePayout(100000, -5)).toThrow("Le taux de commission doit être compris entre 0 et 100.");
    expect(() => calculateMandatePayout(100000, 150)).toThrow("Le taux de commission doit être compris entre 0 et 100.");
  });

  it('doit gérer un mois de vacance (loyer à 0)', () => {
    const result = calculateMandatePayout(0, 8.0);
    expect(result.agencyFee).toBe(0);
    expect(result.ownerPayout).toBe(0);
  });

});
