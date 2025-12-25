const prisma = require('../prisma/client');
const crypto = require('crypto');

/**
 * Migration des Baux Papier vers le Scellement Numérique V4
 */
async function migrateToV4() {
    console.log("🚀 Initialisation de la migration V4...");

    try {
        // 1. Récupération des baux non scellés
        const legacyLeases = await prisma.lease.findMany({
            where: { signatureHash: null }, // Filtre les baux V3
            include: { tenant: true, property: true }
        });

        console.log(`📦 ${legacyLeases.length} baux identifiés pour scellement.`);

        for (const lease of legacyLeases) {
            // 2. Génération de l'empreinte SHA-256 (Preuve d'intégrité)
            const contentToHash = `${lease.id}-${lease.tenantId}-${lease.startDate}-${lease.rentAmount}`;
            const signatureHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

            // 3. Mise à jour avec transaction ACID
            await prisma.$transaction([
                prisma.lease.update({
                    where: { id: lease.id },
                    data: { 
                        signatureHash: signatureHash,
                        status: 'ACTIVE'
                    }
                }),
                // Création du log d'audit pour la Loi 2024-1115
                prisma.activityLog.create({
                    data: {
                        action: 'BAIL_SEALED_V4',
                        category: 'LEGAL',
                        userId: lease.property.ownerId,
                        metadata: { leaseId: lease.id, hash: signatureHash }
                    }
                })
            ]);

            console.log(`✅ Bail ${lease.id} scellé avec succès.`);
        }

        console.log("✨ Migration terminée. Tous les baux sont conformes V4.");
    } catch (error) {
        console.error("❌ Échec de la migration :", error);
    }
}

migrateToV4();
