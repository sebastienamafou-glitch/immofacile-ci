import { Prisma } from '@prisma/client';

export interface QuoteItemInput {
  quantity: number;
  unitPrice: Prisma.Decimal;
}

export const calculateQuoteTotals = (
  items: QuoteItemInput[],
  taxRate: Prisma.Decimal
) => {
  // 1. Calcul du Sous-Total (HT)
  // On utilise les méthodes .mul() et .add() de Prisma.Decimal pour garder la précision
  const subTotal = items.reduce((acc, item) => {
    const itemTotal = item.unitPrice.mul(item.quantity);
    return acc.add(itemTotal);
  }, new Prisma.Decimal(0));

  // 2. Calcul de la TVA
  // ex: si taxRate = 18, on divise par 100 pour avoir le multiplicateur (0.18)
  const taxMultiplier = taxRate.div(100);
  const taxAmount = subTotal.mul(taxMultiplier);

  // 3. Calcul du Total (TTC)
  const totalAmount = subTotal.add(taxAmount);

  return {
    subTotal,
    taxAmount,
    totalAmount,
  };
};
