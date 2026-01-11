// On pointe vers le dossier visible qu'on vient de générer
const { PrismaClient } = require('./client-final');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed FINAL...');

  // Mot de passe crypté
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. ADMIN
  await prisma.user.upsert({
    where: { email: 'admin@immofacile.ci' },
    update: {},
    create: {
      email: 'admin@immofacile.ci',
      name: 'Super Admin',
      password: passwordHash,
      role: 'ADMIN',
      phone: '0101010101',
      kycStatus: 'VERIFIED'
    },
  });
  console.log('✅ Admin créé');

  // 2. PROPRIETAIRE
  const owner = await prisma.user.upsert({
    where: { email: 'proprio@immofacile.ci' },
    update: {},
    create: {
      email: 'proprio@immofacile.ci',
      name: 'M. Proprio',
      password: passwordHash,
      role: 'OWNER',
      phone: '0707070707',
      walletBalance: 0,
      kycStatus: 'VERIFIED'
    },
  });
  console.log('✅ Propriétaire créé');

  // 3. BIEN
  const property = await prisma.property.create({
    data: {
      title: 'Appartement Test',
      address: 'Abidjan',
      commune: 'Cocody',
      price: 250000,
      type: 'APPARTEMENT',
      bedrooms: 2,
      bathrooms: 1,
      ownerId: owner.id,
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    },
  });
  console.log('✅ Bien créé');

  // 4. LOCATAIRE & BAIL
  const tenant = await prisma.user.upsert({
    where: { email: 'locataire@immofacile.ci' },
    update: {},
    create: {
      email: 'locataire@immofacile.ci',
      name: 'Mme. Locataire',
      password: passwordHash,
      role: 'TENANT',
      phone: '0505050505',
      kycStatus: 'VERIFIED'
    },
  });

  const lease = await prisma.lease.create({
    data: {
      startDate: new Date(),
      monthlyRent: 250000,
      depositAmount: 500000,
      status: 'ACTIVE',
      isActive: true,
      tenantId: tenant.id,
      propertyId: property.id,
      signatureStatus: 'COMPLETED'
    },
  });
  console.log('✅ Locataire et Bail créés');

  // 5. PAIEMENT
  await prisma.payment.create({
    data: {
      amount: 500000,
      type: 'DEPOSIT',
      status: 'SUCCESS',
      leaseId: lease.id,
      date: new Date(),
      amountOwner: 0,
      amountPlatform: 0
    }
  });
  console.log('✅ Paiement créé');
  
  console.log('🚀 TOUT EST TERMINÉ !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
