export const validateWalletDebit = (
  currentBalance: number,
  debitAmount: number
): boolean => {
  // 1. Tolérance zéro sur les montants invalides
  if (debitAmount <= 0) {
    throw new Error("Le montant du débit doit être strictement positif.");
  }

  // 2. Vérification des fonds
  if (currentBalance < debitAmount) {
    throw new Error("Fonds insuffisants. Votre solde actuel ne permet pas cette transaction.");
  }

  // 3. Calcul du nouveau solde (Retourne le nouveau solde pour l'update Prisma)
  return true;
};

export const calculateNewBalance = (currentBalance: number, debitAmount: number): number => {
    validateWalletDebit(currentBalance, debitAmount);
    return currentBalance - debitAmount;
}
