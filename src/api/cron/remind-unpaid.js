const { getOverdueLeases } = require('../../utils/paymentChecker');
const emailService = require('../../utils/email');
const tracker = require('../../utils/tracker');

export default async function handler(req, res) {
    const unpaidLeases = await getOverdueLeases();
    
    for (const lease of unpaidLeases) {
        // 1. Envoyer un email de rappel au locataire
        await emailService.sendPaymentReminder(
            lease.tenant.email, 
            lease.tenant.name, 
            lease.monthlyRent
        );

        // 2. Traquer l'action pour le propriétaire
        await tracker.trackAction("AUTO_REMINDER_SENT", "SYSTEM", null, {
            leaseId: lease.id,
            tenantName: lease.tenant.name
        });
    }

    res.status(200).json({ success: true, count: unpaidLeases.length });
}
