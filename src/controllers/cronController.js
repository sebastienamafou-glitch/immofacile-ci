// src/controllers/cronController.js
const prisma = require('../prisma/client');
const emailService = require('../utils/email'); // Assurez-vous que ce service existe
const pushService = require('../utils/pushService');

exports.runDailyReminders = async (req, res) => {
    // 1. SÉCURITÉ (Bloquant Audit)
    // On vérifie que c'est bien Vercel qui appelle, et pas un hacker
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const dayOfMonth = now.getDate();

        // On n'envoie des rappels qu'après le 5 du mois (exemple)
        if (dayOfMonth < 5) {
            return res.status(200).json({ message: "Trop tôt pour les rappels." });
        }

        // 2. OPTIMISATION SQL (Bloquant Audit)
        // On cherche les baux ACTIFS qui n'ont PAS de paiement ce mois-ci
        const unpaidLeases = await prisma.lease.findMany({
            where: {
                isActive: true,
                payments: {
                    none: {
                        date: { gte: startOfMonth } // Aucun paiement depuis le 1er du mois
                    }
                }
            },
            include: {
                tenant: true,
                property: true
            }
        });

        // 3. ENVOI DES RAPPELS (Async pour ne pas bloquer)
        // On utilise Promise.allSettled pour qu'une erreur ne stoppe pas tout
        const results = await Promise.allSettled(unpaidLeases.map(async (lease) => {
            
            // Notification Push (Si le locataire a l'appli)
            if (lease.tenant.id) {
                await pushService.sendNotificationToUser(lease.tenant.id, {
                    title: "Rappel de Loyer 📅",
                    body: `Bonjour ${lease.tenant.name}, votre loyer de ${lease.monthlyRent} FCFA est attendu.`
                });
            }

            // Email (Si configuré)
            if (lease.tenant.email && emailService.sendPaymentReminder) {
                await emailService.sendPaymentReminder(lease.tenant, lease.property);
            }
            
            return lease.tenant.email;
        }));

        res.status(200).json({ 
            success: true, 
            processed: results.length,
            message: "Rappels envoyés avec succès." 
        });

    } catch (error) {
        console.error("CRON ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};
