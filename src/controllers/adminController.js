// controllers/adminController.js
const prisma = require('../prisma/client');

exports.getDashboard = async (req, res) => {
    try {
        // 1. STATISTIQUES GLOBALES
        const totalUsers = await prisma.user.count();
        const totalProperties = await prisma.property.count();
        
        // --- OPTIMISATION : Utilisation de aggregate au lieu de tout charger en mémoire ---
        const revenueAggregation = await prisma.payment.aggregate({
            _sum: { amount: true }
        });
        const volumeAffaires = revenueAggregation._sum.amount || 0;
        
        const myRevenue = volumeAffaires * 0.05;

        // 2. LISTES (USERS & AGENTS)
        const owners = await prisma.user.findMany({
            where: { role: 'OWNER' },
            orderBy: { name: 'asc' }
        });

        const agents = await prisma.user.findMany({
            where: { role: 'AGENT' },
            include: { leads: true } 
        });

        // 3. INCIDENTS & LEADs
        const activeIncidents = await prisma.incident.findMany({
            where: { status: { not: 'RESOLVED' } },
            include: { property: true },
            orderBy: { createdAt: 'desc' },
            take: 5 
        });

        const artisans = await prisma.artisan.findMany();
        const leadsCount = await prisma.lead.count();
        const leads = await prisma.lead.findMany({ 
            orderBy: { createdAt: 'desc' }, 
            take: 5 
        });

        // 4. STATS D'INTERACTION (Business Intelligence)
        const totalInteractions = await prisma.activityLog.count();
        
        // Clics WhatsApp
        const whatsappTotal = await prisma.activityLog.count({
            where: { action: { contains: 'WHATSAPP' } }
        });

        // Incidents signalés au total
        const incidentsTotal = await prisma.activityLog.count({
            where: { action: 'INCIDENT_REPORT' }
        });

        // Répartition par catégorie
        const logsByCategory = await prisma.activityLog.groupBy({
            by: ['category'],
            _count: { _all: true }
        });

        // 5. FLUX LIVE (10 dernières actions)
        const recentActivities = await prisma.activityLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, role: true } } }
        });

        res.render('dashboard-admin', {
            user: req.session.user,
            // Stats de base
            totalUsers,
            totalProperties,
            volumeAffaires,
            myRevenue,
            // Listes
            owners,
            agents,
            activeIncidents,
            artisans,
            leads,
            leadsCount,
            // --- CORRECTION : Ajout des variables manquantes pour la vue ---
            totalInteractions,
            whatsappTotal,
            incidentsTotal,
            logsByCategory,
            recentActivities
        });

    } catch (error) {
        console.error("Erreur Dashboard Admin:", error);
        res.status(500).send("Erreur chargement admin");
    }
};

// --- ACTIONS TRÉSORERIE ---

exports.postAddCredit = async (req, res) => {
    const { ownerId, amount } = req.body;
    const creditAmount = parseFloat(amount);

    // Petite sécurité si le montant est invalide
    if (isNaN(creditAmount) || creditAmount <= 0) {
        return res.redirect('/admin/dashboard?error=invalid_amount');
    }

    try {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: ownerId },
                data: { walletBalance: { increment: creditAmount } }
            }),
            prisma.creditTransaction.create({
                data: {
                    amount: creditAmount,
                    description: `Rechargement Guichet (Admin ${req.session.user?.name || 'Admin'})`,
                    userId: ownerId
                }
            })
        ]);
        res.redirect('/admin/dashboard?success=credit_added');
    } catch (error) {
        console.error("Erreur Ajout Crédit:", error);
        res.redirect('/admin/dashboard?error=transaction_failed');
    }
};

// --- ACTIONS UTILISATEURS ---

exports.postToggleStatus = async (req, res) => {
    const { userId, currentStatus } = req.body;
    
    // Conversion sécurisée de la string "true"/"false" en booléen
    const isActive = String(currentStatus) === 'true';

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isActive: !isActive } 
        });
        // Note: Vérifiez si l'ancre #tresorerie est la bonne section pour les utilisateurs
        res.redirect('/admin/dashboard?success=status_updated#users'); 
    } catch (error) {
        console.error("Erreur toggle status:", error);
        res.redirect('/admin/dashboard?error=update_failed');
    }
};

// --- GESTION ARTISANS ---

exports.postAddArtisan = async (req, res) => {
    const { name, job, location, phone } = req.body;
    try {
        await prisma.artisan.create({
            data: {
                name, job, location, phone,
                isVerified: true 
            }
        });
        res.redirect('/admin/dashboard?success=artisan_created#artisans');
    } catch (error) {
        console.error("Erreur création artisan:", error);
        res.redirect('/admin/dashboard?error=creation_failed');
    }
};

exports.postDeleteArtisan = async (req, res) => {
    const { artisanId } = req.body;
    try {
        await prisma.artisan.delete({ where: { id: artisanId } });
        res.redirect('/admin/dashboard?success=artisan_deleted#artisans');
    } catch (error) {
        console.error("Erreur suppression artisan:", error);
        res.redirect('/admin/dashboard?error=delete_failed');
    }
};
