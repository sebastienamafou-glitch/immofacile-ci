const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Récupération des arguments (ex: node scripts/setAdmin.js admin@immofacile.ci MonMotDePasse123)
const args = process.argv.slice(2);
const email = args[0];
const rawPassword = args[1];

async function setAdmin() {
    if (!email || !rawPassword) {
        console.log("❌ Usage: node scripts/setAdmin.js <email> <mot_de_passe>");
        process.exit(1);
    }

    console.log(`🚀 Tentative de création/mise à jour de l'admin : ${email}...`);

    try {
        // 1. Hachage sécurisé (important pour que l'admin puisse se connecter via le login standard)
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // 2. Upsert (Crée s'il n'existe pas, met à jour s'il existe)
        const user = await prisma.user.upsert({
            where: { email: email },
            update: {
                role: 'ADMIN',
                password: hashedPassword
            },
            create: {
                email: email,
                name: "Administrateur Principal",
                phone: "0000000000", // Valeur par défaut requise par votre schéma @unique
                password: hashedPassword,
                role: 'ADMIN',
                walletBalance: 0,
                escrowBalance: 0
            }
        });

        console.log("✅ Succès ! L'utilisateur est désormais ADMIN.");
        console.log(`📧 Email : ${user.email}`);
        console.log("🔐 Le mot de passe a été haché et stocké en base de données.");

    } catch (error) {
        console.error("❌ Erreur lors de la configuration de l'admin :");
        if (error.code === 'P2002') {
            console.error("Erreur : Le numéro de téléphone ou l'email est déjà utilisé par un autre compte.");
        } else {
            console.error(error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

setAdmin();
