// controllers/agentController.js
const prisma = require('../prisma/client');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // 1. Récupérer les leads de cet agent
        const leads = await prisma.lead.findMany({
            where: { agentId: userId },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Calculer les commissions (Ex: 5000 FCFA par lead signé, 1000 par lead en cours)
        // C'est une estimation pour motiver l'agent
        let commission = 0;
        leads.forEach(lead => {
            if (lead.status === 'SIGNÉ') commission += 10000; // Prime succès
            else commission += 2000; // Prime repérage
        });

        res.render('dashboard-agent', {
            user: req.session.user,
            leads,
            commission
        });

    } catch (error) {
        console.error("Erreur Dashboard Agent:", error);
        res.status(500).send("Erreur chargement espace agent");
    }
};

exports.postAddLead = async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        const userId = req.session.user.id;

        // Gestion de la photo (si uploadée)
        let photoPath = null;
        if (req.file) {
            // On stocke le chemin relatif pour l'afficher dans la vue
            photoPath = '/uploads/' + req.file.filename;
        }

        // Création en base de données
        await prisma.lead.create({
            data: {
                name,
                phone,
                address,
                photo: photoPath,
                agentId: userId,
                status: 'NOUVEAU'
            }
        });

        res.redirect('/agent/dashboard?success=lead_added');

    } catch (error) {
        console.error("Erreur Ajout Lead:", error);
        res.redirect('/agent/dashboard?error=lead_failed');
    }
};
