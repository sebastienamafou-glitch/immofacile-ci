// src/utils/paymentChecker.js (Optimisé V4)
const prisma = require('../prisma/client');

exports.getOverdueLeases = async () => {
    // Calcul des dates du mois en cours (du 1er au 31)
    const date = new Date();
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // REQUÊTE OPTIMISÉE : On ne récupère que ceux qui N'ONT PAS payé
    const overdueLeases = await prisma.lease.findMany({
        where: {
            isActive: true,
            // La clause magique : "Aucun paiement trouvé dans l'intervalle de ce mois"
            payments: {
                none: {
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                }
            }
        },
        include: {
            tenant: { select: { name: true, email: true, phone: true } }, // On ne prend que l'utile
            property: { select: { title: true, owner: true } }
        }
    });

    return overdueLeases;
};
