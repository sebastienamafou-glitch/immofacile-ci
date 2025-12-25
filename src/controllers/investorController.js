// src/controllers/investorController.js
const prisma = require('../prisma/client');

/**
 * 🟢 DASHBOARD : Calculs financiers haute précision (V4)
 */
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Exécution parallèle pour éliminer la latence de 3,49s
        const [investments, financeAgg, activeCount, weightedRoiResult] = await Promise.all([
            // Liste des transactions pour l'affichage
            prisma.investment.findMany({
                where: { investorId: userId },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),
            
            // Somme totale investie via SQL natif
            prisma.investment.aggregate({
                where: { investorId: userId },
                _sum: { amount: true }
            }),

            // Projets en cours
            prisma.investment.count({
                where: { investorId: userId, status: 'ACTIVE' }
            }),

            // ROI Pondéré : (Σ Montant * Taux) / Σ Montant
            // NULLIF évite l'erreur de division par zéro
            prisma.$queryRaw`
                SELECT (SUM(amount * "roiRate") / NULLIF(SUM(amount), 0)) as "weightedRoi"
                FROM "Investment"
                WHERE "investorId" = ${userId}
            `
        ]);

        const totalInvested = financeAgg._sum.amount || 0;
        const averageRoi = weightedRoiResult[0]?.weightedRoi || 0;

        // Préparation des statistiques pour la vue EJS
        const stats = {
            totalInvested: totalInvested,
            activeProjects: activeCount,
            averageRoi: parseFloat(averageRoi).toFixed(1),
            projectedEarnings: Math.round(totalInvested * (averageRoi / 100))
        };

        res.render('investor/dashboard', {
            user: req.session.user,
            investments,
            stats,
            csrfToken: req.csrfToken ? req.csrfToken() : ""
        });

    } catch (error) {
        console.error("🔥 Erreur Dashboard Investisseur:", error);
        res.status(500).send("Erreur de calcul des indicateurs.");
    }
};

/**
 * 🟢 OPPORTUNITÉS : Liste des projets disponibles
 */
exports.getOpportunities = async (req, res) => {
    try {
        // En V4, ces données pourraient venir d'une table "Project", 
        // ici elles sont codées pour garantir l'affichage immédiat.
        const opportunities = [
            {
                id: "opp_cocody_01",
                title: "Construction Immeuble R+4 - Cocody",
                roi: 12.5,
                duration: 24,
                minEntry: 5000000,
                image: "/images/opp-cocody.jpg",
                progress: 30 
            },
            {
                id: "opp_bassam_02",
                title: "Rénovation Villas - Bassam",
                roi: 9.0,
                duration: 12,
                minEntry: 1000000,
                image: "/images/opp-bassam.jpg",
                progress: 85
            }
        ];

        res.render('investor/opportunities', {
            user: req.session.user,
            opportunities,
            csrfToken: req.csrfToken ? req.csrfToken() : ""
        });
    } catch (error) {
        console.error("Erreur Opportunités:", error);
        res.status(500).send("Erreur de chargement.");
    }
};

/**
 * 🟢 EXPORT : Génération de la liste brute (V4 Audit Ready)
 */
exports.exportInvestments = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Récupération de l'intégralité des données sans limite
        const rawData = await prisma.investment.findMany({
            where: { investorId: userId },
            orderBy: { createdAt: 'desc' }
        });

        // On renvoie un JSON propre que le frontend peut transformer en CSV/Excel
        // C'est la méthode la plus légère pour Vercel (évite de charger des librairies lourdes)
        res.json({
            success: true,
            exportDate: new Date().toISOString(),
            investor: req.session.user.name,
            data: rawData
        });
    } catch (error) {
        console.error("Erreur Export:", error);
        res.status(500).json({ success: false, error: "Impossible de générer l'export." });
    }
};
