// controllers/adminController.js
const prisma = require('../prisma/client');

exports.getDashboard = async (req, res) => {
    try {
        // 1. STATISTIQUES
        const totalUsers = await prisma.user.count();
        const totalProperties = await prisma.property.count();
        
        const allPayments = await prisma.payment.findMany({ select: { amount: true } });
        const volumeAffaires = allPayments.reduce((sum, p) => sum + p.amount, 0);
        
        const myRevenue = volumeAffaires * 0.05;

        // 2. LISTES
        const owners = await prisma.user.findMany({
            where: { role: 'OWNER' },
            orderBy: { name: 'asc' }
        });

        const agents = await prisma.user.findMany({
            where: { role: 'AGENT' },
            include: { leads: true } 
        });

        const activeIncidents = await prisma.incident.findMany({
            where: { status: { not: 'RESOLVED' } },
            include: { property: true },
            orderBy: { createdAt: 'desc' },
            take: 5 
        });

        const artisans = await prisma.artisan.findMany();
        const leadsCount = await prisma.lead.count();
        const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });

        res.render('dashboard-admin', {
            user: req.session.user,
            totalUsers,
            totalProperties,
            volumeAffaires,
            myRevenue,
            owners,
            agents,
            activeIncidents,
            artisans,
            leads,
            leadsCount
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

    try {
        // --- CORRECTION SCHEMA : credit -> walletBalance ---
        await prisma.$transaction([
            prisma.user.update({
                where: { id: ownerId },
                data: { walletBalance: { increment: creditAmount } }
            }),
            prisma.creditTransaction.create({
                data: {
                    amount: creditAmount,
                    description: `Rechargement Guichet (Admin ${req.session.user.name})`,
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
    const isActive = currentStatus === 'true' || currentStatus === true;

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isActive: !isActive } 
        });
        res.redirect('/admin/dashboard#tresorerie');
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
        res.redirect('/admin/dashboard?success=artisan_created');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/dashboard?error=creation_failed');
    }
};

exports.postDeleteArtisan = async (req, res) => {
    const { artisanId } = req.body;
    try {
        await prisma.artisan.delete({ where: { id: artisanId } });
        res.redirect('/admin/dashboard?success=artisan_deleted');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/dashboard?error=delete_failed');
    }
};
