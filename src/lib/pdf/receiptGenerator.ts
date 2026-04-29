/**
 * Utilitaire de génération de reçus PDF
 */

export interface RentReceiptPayload {
  receiptNumber: string;
  tenantName: string;
  propertyName: string;
  propertyAddress: string;
  amount: number;
  period: string;
  agencyName: string;
  datePaid: Date;
}

export async function generateRentReceipt(data: RentReceiptPayload): Promise<string> {
  // TODO: Implémenter la génération complète avec @react-pdf/renderer
  // Retourne pour l'instant une URL valide pour la compilation
  return `/api/receipts/download/${data.receiptNumber}`;
}
