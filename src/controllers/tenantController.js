// controllers/tenantController.js
const prisma = require('../prisma/client');
const emailService = require('../utils/email');

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

        // 2. Récupérer l'annuaire des artisans vérifiés
        const artisans = await prisma.artisan.findMany({
            where: { isVerified: true }
        });

        // 3. Rendu de la vue avec les variables globales
        res.render('dashboard-tenant', {
            user: req.session.user, 
            lease: lease || null,
            payments: lease ? lease.payments : [], 
            artisans,
            // Le csrfToken est injecté par le middleware global dans app.js, 
            // mais on s'assure qu'il est passé si besoin explicitement
            csrfToken: req.csrfToken() 
        });

    } catch (error) {
        console.error("Erreur chargement dashboard locataire:", error);
        res.status(500).send("Erreur lors du chargement de votre espace.");
    }
};

exports.postReportIssue = async (req, res) => {
    const { title, priority, description } = req.body;
    const userId = req.session.user.id;

    try {
        // 1. Trouver le bail ET le propriétaire (via include)
        const lease = await prisma.lease.findFirst({ 
            where: { tenantId: userId, isActive: true },
            include: { 
                property: { 
                    include: { owner: true } 
                },
                tenant: true 
            } 
        });

        if (!lease) return res.redirect('/tenant/dashboard?error=no_active_lease');

        // 2. Créer l'incident en base de données
        await prisma.incident.create({
            data: {
                title, 
                priority, 
                description,
                reporterId: userId, 
                propertyId: lease.propertyId
            }
        });

        // 3. ENVOYER L'EMAIL
        // On vérifie que l'email du propriétaire existe avant d'envoyer
        if (lease.property.owner && lease.property.owner.email) {
            emailService.sendIncidentNotification(
                lease.property.owner.email,  
                lease.property.owner.name,   
                lease.tenant.name,           
                lease.property.title,        
                title,                       
                priority                     
            ).catch(err => console.error("Erreur envoi email incident:", err));
        }

        res.redirect('/tenant/dashboard?success=incident_reported');

    } catch (error) {
        console.error("Erreur signalement incident:", error);
        res.redirect('/tenant/dashboard?error=report_failed');
    }
};
