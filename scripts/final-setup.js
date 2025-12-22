const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Initialisation de la configuration finale ImmoFacile CI...");

  // 1. Mise à jour des types de données (Sécurité financière)
  // Assurez-vous d'avoir fait : npx prisma db push avant.

  // 2. Création de logs d'activité initiaux (pour peupler les stats de test)
  // On simule une activité de bienvenue pour les propriétaires existants
  const owners = await prisma.user.findMany({ where: { role: 'OWNER' } });

  for (const owner of owners) {
    await prisma.activityLog.create({
      data: {
        action: "SYSTEM_WELCOME",
        category: "SYSTEM",
        userId: owner.id,
        metadata: { message: "Bienvenue sur la version finale" }
      }
    });
  }

  console.log(`✅ Migration terminée pour ${owners.length} propriétaires.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
