const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const lastUser = await prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!lastUser) return console.log("❌ Aucun utilisateur.");
    await prisma.user.update({
        where: { id: lastUser.id },
        data: { role: 'ADMIN', walletBalance: 1000000 }
    });
    console.log(`✅ ${lastUser.name} est ADMIN.`);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());