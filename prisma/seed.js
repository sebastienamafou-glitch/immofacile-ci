const path = require('path');

// --- CORRECTION DU CHEMIN (Chemin Absolu) ---
// On calcule l'adresse exacte du dossier "client-local" par rapport à ce fichier
// __dirname = le dossier "prisma"
const clientPath = path.join(__dirname, 'client-local');

console.log("📍 Tentative de chargement du client depuis :", clientPath);

// On importe le client depuis ce chemin précis
const { PrismaClient } = require(clientPath);
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du chargement des données (Seeding)...');

  // Hachage du mot de passe
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Création ADMIN
  const admin = await prisma.user.upsert({
    where: { email: 'admin@immofacile.ci' },
    update: {},
    create: {
      email: 'admin@immofacile.ci',
      phone: '0101010101',
      name: 'Super Administrateur',
      password: passwordHash,
      role: 'ADMIN',
      kycStatus: 'VERIFIED'
    },
  });
  console.log('✅ Admin créé : admin@immofacile.ci');

  // 2. Création PROPRIÉTAIRE
  const owner = await prisma.user.upsert({
    where: { email: 'proprio@immofacile.ci' },
    update: {},
    create: {
      email: 'proprio@immofacile.ci',
      phone: '0707070707',
      name: 'M. Kouassi Propriétaire',
      password: passwordHash,
      role: 'OWNER',
      walletBalance: 0,
      kycStatus: 'VERIFIED'
    },
  });
  console.log('✅ Propriétaire créé : proprio@immofacile.ci');

  // 3. Création BIEN IMMOBILIER
  const property = await prisma.property.create({
    data: {
      title: 'Résidence les Perles - Cocody',
      address: 'Cocody Angré 8ème Tranche',
      commune: 'Cocody',
      price: 250000,
      type: 'APPARTEMENT',
      bedrooms: 3,
      bathrooms: 2,
      ownerId: owner.id,
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    },
  });
  console.log('✅ Bien créé : Résidence les Perles');

  // 4. Création LOCATAIRE
  const tenant = await prisma.user.upsert({
    where: { email: 'locataire@immofacile.ci' },
    update: {},
    create: {
      email: 'locataire@immofacile.ci',
      phone: '0505050505',
      name: 'Mme. Touré Locataire',
      password: passwordHash,
      role: 'TENANT',
      kycStatus: 'VERIFIED'
    },
  });
  console.log('✅ Locataire créé : locataire@immofacile.ci');

  // 5. Création CONTRAT DE BAIL (Actif)
  const lease = await prisma.lease.create({
    data: {
      startDate: new Date('2025-01-01'),
      monthlyRent: 250000,
      depositAmount: 500000,
      status: 'ACTIVE',
      isActive: true,
      tenantId: tenant.id,
      propertyId: property.id,
      signatureStatus: 'COMPLETED'
    },
  });
  console.log('✅ Bail créé et actif');

  // 6. Création PAIEMENTS (V5 Split)
  await prisma.payment.createMany({
    data: [
      { 
        amount: 500000, 
        type: 'DEPOSIT', 
        status: 'SUCCESS', 
        leaseId: lease.id, 
        date: new Date('2025-01-01'),
        method: 'WAVE',
        amountOwner: 0,
        amountPlatform: 0
      },
      { 
        amount: 250000, 
        type: 'LOYER', 
        status: 'SUCCESS', 
        leaseId: lease.id, 
        date: new Date('2025-02-01'), 
        month: 'Février 2025',
        method: 'ORANGE_MONEY',
        amountOwner: 225000,
        amountPlatform: 25000
      },
    ],
  });
  console.log('✅ Paiements historiques créés');

  console.log('🚀 Seeding terminé avec succès !');
}

main()
  .catch((e) => {
    console.error("❌ ERREUR :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
