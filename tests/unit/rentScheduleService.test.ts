import { describe, it, expect, beforeEach } from 'vitest';
import { generateRentSchedules } from '@/features/leases/services/rentScheduleService';
import { prismaMock } from '../setup/vitest.setup';
import { Lease, LeaseStatus, SignatureStatus } from '@prisma/client';

describe('Service : Moteur de Quittancement (PropTech Core)', () => {

  // Objet de base pour nos tests
  const baseLease: Lease = {
    id: 'lease_123',
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: new Date('2027-01-01T00:00:00Z'), // Exactement 1 an (12 mois)
    monthlyRent: 1500000,
    depositAmount: 3000000,
    advanceAmount: 1500000,
    status: LeaseStatus.ACTIVE,
    isActive: true,
    signatureStatus: SignatureStatus.COMPLETED,
    tenantId: 'tenant_1',
    propertyId: 'prop_1',
    agentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    contractUrl: null,
    documentHash: null,
    agencyCommissionRate: 0.1,
    noticeGivenAt: null,
    plannedDepartureDate: null,
    tenantLeasingFee: 0,
    ownerLeasingFee: 0,
  };

  beforeEach(() => {
    // On simule que createMany retourne un objet { count: X }
    prismaMock.rentSchedule.createMany.mockResolvedValue({ count: 12 });
  });

  it('doit générer exactement 12 échéances pour un bail de 1 an', async () => {
    const result = await generateRentSchedules(baseLease);

    expect(result.success).toBe(true);
    expect(result.count).toBe(12);
    expect(result.schedules).toHaveLength(12);
    
    // Vérification de la première échéance
    expect(result.schedules[0].expectedDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    // Vérification de la dernière échéance (Décembre)
    expect(result.schedules[11].expectedDate.toISOString()).toBe('2026-12-01T00:00:00.000Z');

    expect(prismaMock.rentSchedule.createMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.rentSchedule.createMany).toHaveBeenCalledWith({
      data: result.schedules,
    });
  });

  it('doit générer exactement 6 échéances pour un bail de 6 mois', async () => {
    const sixMonthsLease = {
      ...baseLease,
      endDate: new Date('2026-07-01T00:00:00Z')
    };

    const result = await generateRentSchedules(sixMonthsLease);
    expect(result.count).toBe(6);
  });

  it('doit BLOQUER la génération si le bail n\'a pas de date de fin', async () => {
    const infiniteLease = { ...baseLease, endDate: null };

    await expect(generateRentSchedules(infiniteLease))
      .rejects.toThrow("Génération impossible : Le bail doit avoir une date de fin définie.");
    
    expect(prismaMock.rentSchedule.createMany).not.toHaveBeenCalled();
  });

  it('doit BLOQUER la génération si les dates sont incohérentes (Début > Fin)', async () => {
    const paradoxLease = { 
      ...baseLease, 
      startDate: new Date('2027-01-01T00:00:00Z'),
      endDate: new Date('2026-01-01T00:00:00Z')
    };

    await expect(generateRentSchedules(paradoxLease))
      .rejects.toThrow("La date de début doit être strictement antérieure à la date de fin.");
  });

});
