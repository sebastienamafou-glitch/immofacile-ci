export interface LeaseFinancials {
  monthlyRent: number;
  depositMonths: number;
  advanceMonths: number;
  agencyCommissionRate: number; // ex: 0.10 pour 10%
}

export const calculateInitialLeaseFees = (data: LeaseFinancials) => {
  const depositAmount = data.monthlyRent * data.depositMonths;
  const advanceAmount = data.monthlyRent * data.advanceMonths;
  
  // Règle métier : l'agence prend 1 mois de loyer comme honoraires (répartis 50/50 entre locataire et proprio)
  const totalAgencyFee = data.monthlyRent; 
  const tenantLeasingFee = totalAgencyFee * 0.5;

  return {
    depositAmount,
    advanceAmount,
    tenantLeasingFee,
    totalToPay: depositAmount + advanceAmount + tenantLeasingFee,
  };
};
