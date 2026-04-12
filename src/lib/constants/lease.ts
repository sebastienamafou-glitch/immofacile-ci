// /lib/constants/lease.ts

export const LEASE_CONSTANTS = {
  // Loi ivoirienne : Caution et Avance plafonnées
  LEGAL_DEPOSIT_MONTHS: 2, // Caution (Garantie)
  LEGAL_ADVANCE_MONTHS: 2, // Loyer d'avance

  // Fonctions utilitaires partagées (Front-end & Back-end)
  calculateDeposit: (monthlyRent: number) => monthlyRent * LEASE_CONSTANTS.LEGAL_DEPOSIT_MONTHS,
  calculateAdvance: (monthlyRent: number) => monthlyRent * LEASE_CONSTANTS.LEGAL_ADVANCE_MONTHS,
  
  // Total des droits d'entrée
  calculateTotalEntryFees: (monthlyRent: number) => {
    return (monthlyRent * LEASE_CONSTANTS.LEGAL_DEPOSIT_MONTHS) + 
           (monthlyRent * LEASE_CONSTANTS.LEGAL_ADVANCE_MONTHS);
  }
} as const;
