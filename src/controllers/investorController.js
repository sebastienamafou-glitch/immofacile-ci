const prisma = require('../prisma/client');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const investments = await prisma.investment.findMany({
            where: { investorId: userId },
            orderBy: { startDate: 'desc' }
        });

        // Calculs des stats
        const totalInvested = investments.reduce((sum, inv) => sum + (inv.status === 'ACTIVE' ? inv.amount : 0), 0);
        
        // Calcul du profit théorique annuel
        const projectedProfit = investments.reduce((sum, inv) => {
            if(inv.status !== 'ACTIVE') return sum;
            return sum + (inv.amount * (inv.roiRate / 100));
        }, 0);

        res.render('investor/dashboard', {
            user: req.session.user,
            investments,
            totalInvested,
            projectedProfit
        });
    } catch (error) {
        console.error("Erreur Dashboard Investisseur:", error);
        res.redirect('/');
    }
};

exports.getOpportunities = async (req, res) => {
    // Ici, vous afficherez les projets disponibles (codés en dur pour l'instant ou via une table Project)
    res.render('investor/opportunities', { user: req.session.user });
};
