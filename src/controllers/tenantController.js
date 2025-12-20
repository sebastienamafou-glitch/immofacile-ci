// controllers/tenantController.js
const prisma = require('../prisma/client');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // 1. Récupérer le bail actif et les infos associées
        const lease = await prisma.lease.findFirst({
            where: { tenantId: userId, isActive: true },
            include: { 
                property: { include: { owner: true } }, 
                payments: { orderBy: { date: 'desc' } } 
            }
        });

        if (!lease) {
            return res.render('dashboard-tenant', { 
                user: req.session.user, 
                lease: null, 
                payments: [], 
                artisans: [] 
            });
        }

        // 2. Récupérer l'annuaire des artisans (Global ou filtré par zone si vous voulez)
        // Ici on prend tous les artisans vérifiés
        const artisans = await prisma.artisan.findMany({
            where: { isVerified: true }
        });

        res.render('dashboard-tenant', {
            user: req.session.user, 
            lease,
            payments: lease.payments, 
            artisans 
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur chargement espace locataire");
    }
};

exports.postReportIssue = async (req, res) => {
    const { title, priority, description } = req.body;
    const userId = req.session.user.id;

    try {
        // Trouver le bail pour savoir à quel bien (Property) lier l'incident
        const lease = await prisma.lease.findFirst({ 
            where: { tenantId: userId, isActive: true } 
        });

        if (!lease) return res.redirect('/tenant/dashboard?error=no_active_lease');

        await prisma.incident.create({
            data: {
                title, 
                priority, 
                description,
                reporterId: userId, 
                propertyId: lease.propertyId
            }
        });

        res.redirect('/tenant/dashboard?success=incident_reported');
    } catch (error) {
        console.error(error);
        res.redirect('/tenant/dashboard?error=report_failed');
    }
};
