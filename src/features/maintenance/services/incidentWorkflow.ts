import { IncidentStatus, QuoteStatus } from '@prisma/client';

export const validateIncidentResolution = (
  currentIncidentStatus: IncidentStatus,
  quoteStatus?: QuoteStatus | null
): boolean => {
  // 1. Règle d'immuabilité : On ne touche pas au passé
  if (currentIncidentStatus === IncidentStatus.CLOSED) {
    throw new Error("Opération impossible : Cet incident est déjà définitivement clôturé.");
  }

  // 2. Règle financière : Validation stricte du devis s'il existe
  if (quoteStatus) {
    if (quoteStatus === QuoteStatus.PENDING) {
      throw new Error("L'incident ne peut être résolu : le devis est encore en attente de validation.");
    }
    if (quoteStatus === QuoteStatus.REJECTED) {
      throw new Error("L'incident ne peut être résolu : le devis a été refusé par le propriétaire.");
    }
    // Si on arrive ici, le devis est soit ACCEPTED soit PAID, c'est légal.
  }

  // 3. Si aucune règle n'est violée, la transition vers RESOLVED est autorisée
  return true;
};
