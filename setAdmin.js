const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. On cherche le tout dernier utilisateur inscrit
    const lastUser = await prisma.user.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!lastUser) {
        console.log("❌ Aucun utilisateur trouvé. Inscrivez-vous d'abord sur le site !");
        return;
    }

    // 2. On le transforme en ADMIN
    await prisma.user.update({
        where: { id: lastUser.id },
        data: { 
            role: 'ADMIN',
            walletBalance: 1000000 // On lui donne un peu de budget pour tester ;)
        }
    });

    console.log(`✅ SUCCÈS : L'utilisateur ${lastUser.name} (${lastUser.email}) est maintenant SUPER ADMIN.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
