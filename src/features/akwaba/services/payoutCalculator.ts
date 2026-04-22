export const calculateBookingPayout = (
  totalAmount: number,
  platformRate: number = 0.10, // Babimmo prend 10% par défaut
  agencyRate: number = 0       // 0% par défaut, modifiable si un agent gère le bien
) => {
  if (totalAmount < 0) {
    throw new Error("Le montant d'une réservation ne peut pas être négatif.");
  }

  // Calcul strict avec arrondi monétaire (FCFA = pas de centimes)
  const platformCommission = Math.round(totalAmount * platformRate);
  const agencyCommission = Math.round(totalAmount * agencyRate);
  
  // L'hôte récupère le reste exact pour garantir que la somme totale est toujours respectée
  const hostPayout = totalAmount - platformCommission - agencyCommission;

  return {
    totalAmount,
    platformCommission,
    agencyCommission,
    hostPayout,
  };
};
