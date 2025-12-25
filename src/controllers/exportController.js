// src/controllers/exportController.js
const prisma = require('../prisma/client');

/**
 * Génère un bilan fiscal pour un propriétaire (V4 Audit)
 */
exports.generateTaxSummary = async (req, res) => {
    try {
        const ownerId = req.session.user.id;
        
        // 🟢 Utilisation de l'agrégation pour le bilan fiscal (Performance Vercel)
        const summary = await prisma.payment.aggregate({
            where: {
                lease: { property: { ownerId: ownerId } },
                date: {
                    gte: new Date(new Date().getFullYear(), 0, 1), // Depuis le 1er Janvier
                }
            },
            _sum: { amount: true },
            _count: { _all: true }
        });

        // Pour ce MVP, nous renvoyons un format JSON structuré 
        // que le navigateur peut imprimer proprement (Window.print)
        res.render('exports/tax-summary', {
            user: req.session.user,
            year: new Date().getFullYear(),
            totalRevenue: summary._sum.amount || 0,
            transactionCount: summary._count._all,
            generatedAt: new Date()
        });
    } catch (error) {
        console.error("Erreur Export Fiscal:", error);
        res.status(500).send("Erreur lors de la génération du bilan.");
    }
};
