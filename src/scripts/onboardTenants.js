// src/scripts/onboardTenants.js
const prisma = require('../prisma/client');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');

// Configuration SendGrid (Assurez-vous que la clé est dans votre .env)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Onboarding massif des locataires avec Scellement V4 et Notification Email
 */
async function onboardTenants(tenantList) {
    console.log(`🚀 Lancement de l'onboarding pour ${tenantList.length} locataires...`);

    for (const data of tenantList) {
        try {
            // 1. Génération du Hash de scellement (Preuve d'intégrité V4)
            const leaseFingerprint = crypto.createHash('sha256')
                .update(`${data.email}-${data.propertyId}-${data.rent}`)
                .digest('hex');

            // 2. Génération d'un mot de passe temporaire sécurisé
            const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase(); // Ex: A1B2C3D4

            await prisma.$transaction(async (tx) => {
                // 3. Création du compte utilisateur
                const user = await tx.user.create({
                    data: {
                        email: data.email.toLowerCase(),
                        name: data.name,
                        phone: data.phone,
                        role: 'TENANT',
                        isActive: true,
                        walletBalance: 0 // Initialisation Trésorerie V4
                    }
                });

                // 4. Création du bail scellé
                const lease = await tx.lease.create({
                    data: {
                        tenantId: user.id,
                        propertyId: data.propertyId,
                        rentAmount: data.rent,
                        startDate: new Date(),
                        status: 'ACTIVE',
                        signatureHash: leaseFingerprint
                    },
                    include: { property: true }
                });

                // 5. Envoi de l'email de bienvenue (Notification V4)
                const msg = {
                    to: data.email,
                    from: 'noreply@immofacile-ci.com', // Votre adresse expéditeur vérifiée
                    subject: 'Bienvenue sur ImmoFacile CI - Vos accès locataire',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; color: #0B1120;">
                            <h2>Félicitations ${data.name} !</h2>
                            <p>Votre compte locataire est prêt pour le bien : <strong>${lease.property.title || 'Votre logement'}</strong>.</p>
                            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p><strong>Identifiants de connexion :</strong></p>
                                <p>Email : ${data.email}</p>
                                <p>Mot de passe temporaire : <strong style="color: #2563eb;">${tempPassword}</strong></p>
                            </div>
                            <p style="font-size: 11px; color: #64748b;">
                                Ce bail est scellé cryptographiquement (Loi 2024-1115).<br>
                                Hash : <code>${leaseFingerprint}</code>
                            </p>
                        </div>
                    `
                };
                await sgMail.send(msg);

                // 6. Log d'Audit final
                await tx.activityLog.create({
                    data: {
                        action: 'TENANT_ONBOARDED_WITH_MAIL',
                        category: 'ADMIN',
                        userId: user.id,
                        metadata: { leaseId: lease.id, hash: leaseFingerprint }
                    }
                });
            });

            console.log(`✅ Onboardé & Notifié : ${data.name}`);
        } catch (error) {
            console.error(`❌ Échec pour ${data.email} :`, error.message);
        }
    }
    console.log("✨ Migration et Onboarding terminés.");
}

// Exemple de données pour les 100 locataires
const tenantsToImport = [
    { name: "Jean Kouassi", email: "jean.kouassi@example.com", phone: "0701020304", propertyId: "clldj8v7e0001...", rent: 250000 },
    // Ajoutez vos locataires ici
];

onboardTenants(tenantsToImport);
