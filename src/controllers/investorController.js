// src/controllers/investorController.js
const prisma = require('../prisma/client');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // 1. Récupérer les investissements de l'utilisateur
        const investments = await prisma.investment.findMany({
            where: { investorId: userId },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Calcul des KPI (Indicateurs Clés)
        let stats = {
            totalInvested: 0,
            projectedEarnings: 0,
            activeProjects: 0,
            averageRoi: 0
        };

        if (investments.length > 0) {
            stats.totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
            stats.activeProjects = investments.filter(inv => inv.status === 'ACTIVE').length;
            
            // Calcul des gains prévisionnels (Montant * Taux / 100)
            const totalWeightedRoi = investments.reduce((sum, inv) => sum + (inv.amount * inv.roiRate), 0);
            stats.averageRoi = (totalWeightedRoi / stats.totalInvested).toFixed(1);
            stats.projectedEarnings = (stats.totalInvested * (stats.averageRoi / 100));
        }

        // 3. Rendu de la vue
        res.render('investor/dashboard', {
            user: req.session.user,
            investments,
            stats,
            csrfToken: req.csrfToken ? req.csrfToken() : ""
        });

    } catch (error) {
        console.error("Erreur Dashboard Investisseur:", error);
        res.status(500).send("Erreur serveur lors du chargement des investissements.");
    }
};

exports.getOpportunities = async (req, res) => {
    // Simulation d'opportunités (Pour la V3, on pourrait créer un modèle "Opportunity")
    const opportunities = [
        {
            id: 1,
            title: "Construction Immeuble R+4 - Cocody",
            roi: 12.5,
            duration: 24,
            minEntry: 5000000,
            image: "/images/opp-cocody.jpg",
            progress: 30 // Pourcent financé
        },
        {
            id: 2,
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
        opportunities
    });
};
