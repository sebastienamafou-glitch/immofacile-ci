const prisma = require('../prisma/client');

exports.getOverdueLeases = async () => {
    const currentMonth = new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    
    // On cherche les baux actifs dont le dernier paiement ne correspond pas au mois actuel
    const overdue = await prisma.lease.findMany({
        where: { isActive: true },
        include: {
            tenant: true,
            property: { include: { owner: true } },
            payments: {
                orderBy: { date: 'desc' },
                take: 1
            }
        }
    });

    return overdue.filter(lease => {
        const lastPayment = lease.payments[0];
        return !lastPayment || !lastPayment.month.includes(currentMonth);
    });
};
