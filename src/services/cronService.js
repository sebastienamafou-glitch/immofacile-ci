const cron = require('node-cron');
const prisma = require('../prisma/client');

// Tâche planifiée : Tous les jours à 08:00
cron.schedule('0 8 * * *', async () => {
    console.log('⏰ CRON: Vérification des loyers...');
    
    const today = new Date();
    const dayOfMonth = today.getDate(); // ex: le 5

    // Trouver tous les baux actifs dont la date de paiement est demain
    // (Simplification : on suppose que le loyer est dû le 5)
    if (dayOfMonth === 4) { // Jour J-1
        const activeLeases = await prisma.lease.findMany({
            where: { isActive: true },
            include: { tenant: true, property: true }
        });

        for (const lease of activeLeases) {
            // Créer une notification interne dans l'app
            await prisma.incident.create({ // Ou une table Notification dédiée
                data: {
                    title: "Loyer dû demain",
                    description: `Le loyer de ${lease.tenant.name} arrive à échéance. Cliquez pour envoyer un rappel WhatsApp.`,
                    priority: "LOW",
                    reporterId: lease.property.ownerId, // Pour le proprio
                    propertyId: lease.propertyId,
                    status: "OPEN" 
                }
            });
            // Ici, on pourrait envoyer un Email automatique ou un SMS via Twilio si budget
        }
    }
});
