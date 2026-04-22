import { describe, it, expect } from 'vitest';
import { validateIncidentResolution } from '@/features/maintenance/services/incidentWorkflow';
import { IncidentStatus, QuoteStatus } from '@prisma/client';

describe('Service : Automate de Statuts Maintenance (Incident Workflow)', () => {

  it('doit autoriser la résolution si le devis est ACCEPTED', () => {
    // Arrange & Act
    const isValid = validateIncidentResolution(IncidentStatus.QUOTATION, QuoteStatus.ACCEPTED);
    // Assert
    expect(isValid).toBe(true);
  });

  it('doit autoriser la résolution si le devis est déjà PAID', () => {
    const isValid = validateIncidentResolution(IncidentStatus.IN_PROGRESS, QuoteStatus.PAID);
    expect(isValid).toBe(true);
  });

  it('doit autoriser la résolution immédiate pour un petit incident (sans devis)', () => {
    // Si c'est juste revisser une poignée, il n'y a pas de Quote en base
    const isValid = validateIncidentResolution(IncidentStatus.IN_PROGRESS, null);
    expect(isValid).toBe(true);
  });

  it('doit BLOQUER la résolution si le devis est en attente (PENDING)', () => {
    expect(() => 
      validateIncidentResolution(IncidentStatus.QUOTATION, QuoteStatus.PENDING)
    ).toThrow("L'incident ne peut être résolu : le devis est encore en attente de validation.");
  });

  it('doit BLOQUER la résolution si le devis a été refusé (REJECTED)', () => {
    expect(() => 
      validateIncidentResolution(IncidentStatus.QUOTATION, QuoteStatus.REJECTED)
    ).toThrow("L'incident ne peut être résolu : le devis a été refusé par le propriétaire.");
  });

  it('doit BLOQUER toute modification sur un incident déjà archivé (CLOSED)', () => {
    expect(() => 
      validateIncidentResolution(IncidentStatus.CLOSED, QuoteStatus.PAID)
    ).toThrow("Opération impossible : Cet incident est déjà définitivement clôturé.");
  });

});
