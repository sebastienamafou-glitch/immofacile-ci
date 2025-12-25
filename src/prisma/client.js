// src/prisma/client.js
const { PrismaClient } = require('@prisma/client');

// Fonction pour créer une nouvelle instance
const prismaClientSingleton = () => {
  return new PrismaClient({
    // En prod, on ne log que les erreurs pour ne pas polluer Vercel
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
  });
};

// On stocke l'instance dans l'objet global pour qu'elle survive au "Hot Reload" en dev
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
