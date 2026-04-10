import { Prisma } from "@prisma/client";

// =============================================================================
// 🛡️ TYPES PARTAGÉS — À importer dans tous les services billing
//    Chemin suggéré : @/services/billing/types.ts
// =============================================================================

/**
 * Client Prisma borné à une transaction ouverte.
 * On exclut les méthodes de cycle de vie qui n'ont pas de sens dans ce contexte.
 */
export type TxClient = Omit<
    Prisma.TransactionClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Sous-ensemble de la réponse CinetPay utilisé par nos moteurs de traitement.
 * Tous les champs optionnels doivent être normalisés avec ?? avant utilisation.
 */
export interface CinetPayApiData {
    payment_method: string;
    status: string;
    amount: string;
    currency?: string;
    description?: string;
    payment_date?: string;
}
