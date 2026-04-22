export const calculateMandatePayout = (
  collectedRent: number,
  commissionRatePercentage: number // ex: 8.0 pour 8%
) => {
  if (collectedRent < 0) {
    throw new Error("Le loyer collecté ne peut pas être négatif.");
  }
  if (commissionRatePercentage < 0 || commissionRatePercentage > 100) {
    throw new Error("Le taux de commission doit être compris entre 0 et 100.");
  }

  // Calcul de la part de l'agence (Frais de gestion)
  // On divise par 100 car on reçoit un pourcentage (ex: 8 / 100 = 0.08)
  const agencyFee = Math.round(collectedRent * (commissionRatePercentage / 100));
  
  // Le propriétaire reçoit le reste
  const ownerPayout = collectedRent - agencyFee;

  return {
    collectedRent,
    agencyFee,
    ownerPayout,
  };
};
