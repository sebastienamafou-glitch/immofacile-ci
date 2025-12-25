const sealing = require('./src/utils/sealingService');
const prisma = require('./src/prisma/client');

async function testV4() {
    console.log("🚀 Démarrage du test de scellement V4...");

    // 1. Simuler un contenu de bail
    const bailContent = "CONTRAT DE BAIL IMMOFACILE V4 - LOYER 250.000 XOF";
    const hash = sealing.calculateDocumentHash(bailContent);
    console.log("✅ Hash SHA-256 généré :", hash);

    try {
        // 2. Créer une preuve de signature test dans la nouvelle table
        // Assurez-vous d'avoir au moins un bail (lease) existant dans votre DB
        const firstLease = await prisma.lease.findFirst();
        
        if (!firstLease) {
            console.log("❌ Aucun bail trouvé en base pour le test.");
            return;
        }

        const proof = await prisma.signatureProof.upsert({
            where: { leaseId: firstLease.id },
            update: { documentHash: hash, ownerOtp: "123456" },
            create: { leaseId: firstLease.id, documentHash: hash, ownerOtp: "123456" }
        });

        console.log("💎 Preuve enregistrée en base Neon avec succès ! ID:", proof.id);
        
    } catch (error) {
        console.error("❌ Erreur lors du test :", error);
    } finally {
        await prisma.$disconnect();
    }
}

testV4();
