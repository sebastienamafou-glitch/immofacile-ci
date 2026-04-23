import { PrismaClient, RentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Recherche du bail de test...");
  
  // On récupère le bail de la Villa Emeraude créé par ton seed
  const lease = await prisma.lease.findFirst({
    where: { property: { title: "Villa Emeraude" } }
  });

  if (!lease) {
    console.error("❌ Aucun bail trouvé. As-tu bien lancé ton seed ?");
    return;
  }

  // On crée un loyer attendu pour le mois dernier (pour simuler un retard)
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  await prisma.rentSchedule.create({
    data: {
      expectedDate: lastMonth,
      amount: lease.monthlyRent,
      status: RentStatus.PENDING,
      leaseId: lease.id
    }
  });

  console.log("✅ Loyer impayé généré avec succès ! Tu peux rafraîchir ta page.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
