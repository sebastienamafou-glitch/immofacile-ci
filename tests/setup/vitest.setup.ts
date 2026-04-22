import { beforeEach, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

// 1. On crée un mock profond du client Prisma
const prismaMock = mockDeep<PrismaClient>();

// 2. On intercepte les appels vers ton VRAI singleton /lib/prisma.ts
vi.mock('@/lib/prisma', () => ({
  default: prismaMock, // Ou export const prisma = ... selon comment tu l'as exporté
  prisma: prismaMock,
}));

// 3. Avant chaque test unitaire, on réinitialise le mock pour éviter les fuites de mémoire
beforeEach(() => {
  mockReset(prismaMock);
});

export { prismaMock };
