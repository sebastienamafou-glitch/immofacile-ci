import { describe, it, expect } from 'vitest';
import { validateWalletDebit, calculateNewBalance } from '@/features/finance/services/walletService';

describe('Service : Moteur de Portefeuille (Wallet Service)', () => {

  it('doit autoriser un débit valide et calculer le nouveau solde', () => {
    // Arrange : Solde de 50 000 FCFA, on veut payer 20 000 FCFA
    const currentBalance = 50000;
    const debitAmount = 20000;

    // Act
    const isValid = validateWalletDebit(currentBalance, debitAmount);
    const newBalance = calculateNewBalance(currentBalance, debitAmount);

    // Assert
    expect(isValid).toBe(true);
    expect(newBalance).toBe(30000);
  });

  it('doit autoriser un débit qui vide exactement le portefeuille', () => {
    const newBalance = calculateNewBalance(15000, 15000);
    expect(newBalance).toBe(0);
  });

  it('doit BLOQUER la transaction si les fonds sont insuffisants', () => {
    // Tentative de payer 100 000 avec seulement 10 000 sur le compte
    expect(() => 
      validateWalletDebit(10000, 100000)
    ).toThrow("Fonds insuffisants. Votre solde actuel ne permet pas cette transaction.");
  });

  it('doit BLOQUER les montants négatifs (Hack de création de monnaie)', () => {
    // Un hacker tente d'envoyer -5000 pour augmenter son propre solde
    expect(() => 
      validateWalletDebit(10000, -5000)
    ).toThrow("Le montant du débit doit être strictement positif.");
  });

  it('doit BLOQUER les montants à zéro', () => {
    expect(() => 
      validateWalletDebit(10000, 0)
    ).toThrow("Le montant du débit doit être strictement positif.");
  });

});
