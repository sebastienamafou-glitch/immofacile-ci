import { prisma } from '@/lib/prisma';
import { InvestmentPack } from '@prisma/client';

export const createInvestmentContract = async (
  userId: string, 
  pack: InvestmentPack, 
  amount: number, 
  ipAddress: string
) => {
  // Règle de gestion stricte (Clean Code)
  if (amount < 100000) {
    throw new Error("Le montant minimum d'investissement est de 100 000 FCFA.");
  }

  // Création en base de données
  const contract = await prisma.investmentContract.create({
    data: {
      userId,
      packName: pack,
      amount,
      ipAddress,
      signatureData: "pending_signature", // Attente de la signature électronique
      status: "PENDING"
    }
  });

  return contract;
};
