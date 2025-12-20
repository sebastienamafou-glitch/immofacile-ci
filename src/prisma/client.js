// Fichier : src/prisma/client.js
const { PrismaClient } = require('@prisma/client');

// On instancie le client Prisma une seule fois pour toute l'app
const prisma = new PrismaClient();

module.exports = prisma;
