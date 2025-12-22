const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // 1. Créer le Super Admin
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@immofacile.ci' },
    update: {},
    create: {
      email: 'admin@immofacile.ci',
      phone: '0783974175',
      name: 'Super Admin',
      password: hashedPassword,
      role: 'ADMIN',
      walletBalance: 0,
      escrowBalance: 0
    },
  });

  console.log({ admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
