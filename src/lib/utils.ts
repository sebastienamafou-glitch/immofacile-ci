import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { PaymentProvider } from "@prisma/client" // ✅ NOUVEL IMPORT

// Utilitaire standard pour les classes CSS (Déjà présent)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatage Monétaire (FCFA)
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0 FCFA";

  const value = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(value)) return "0 FCFA";

  // Formatage officiel Côte d'Ivoire (fr-CI)
  return new Intl.NumberFormat("fr-CI", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0,
  }).format(value);
}

// ✅ AJOUT CRITIQUE : Mapper CinetPay -> Prisma
/**
 * Mappe les codes bruts de CinetPay vers l'Enum strict Prisma PaymentProvider.
 */
export function mapCinetPayMethod(rawMethod?: string): PaymentProvider {
  if (!rawMethod) return PaymentProvider.CASH;

  const method = rawMethod.toUpperCase();

  if (method.includes("WAVE")) return PaymentProvider.WAVE;
  if (method.includes("OM") || method.includes("ORANGE")) return PaymentProvider.ORANGE_MONEY;
  if (method.includes("MOMO") || method.includes("MTN")) return PaymentProvider.MTN_MOMO;
  if (method.includes("MOOV") || method.includes("FLOOZ") || method.includes("FLZ")) return PaymentProvider.MOOV_MONEY;
  if (method.includes("VISA") || method.includes("MASTER") || method.includes("CARD")) return PaymentProvider.STRIPE;

  return PaymentProvider.CASH; 
}
