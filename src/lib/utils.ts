import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Utilitaire standard pour les classes CSS (Déjà présent)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ✅ AJOUT CRITIQUE : Formatage Monétaire (FCFA)
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
