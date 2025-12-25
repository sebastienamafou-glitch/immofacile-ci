// src/controllers/adminController.js
const prisma = require('../prisma/client');
const { Parser } = require('json2csv');

exports.getDashboard = async (req, res) => {
    try {
        // --- 🟢 OPTIMISATION V4 : EXÉCUTION PARALLÈLE ---
        const [
            userStats, 
            propertyCount, 
            revenueAgg, 
            activeIncidents,
            artisans,
            leadStats,
            interactionStats,
            recentActivities,
            incidentsCount // Ajout pour les stats globales
        ] = await Promise.all([
            prisma.user.groupBy({
                by: ['role'],
                _count: { _all: true }
            }),
            prisma.property.count(),
            prisma.payment.aggregate({
                _sum: { amount: true }
            }),
            prisma.incident.findMany({
                where: { status: { not: 'RESOLVED' } },
                include: { property: true },
                orderBy: { createdAt: 'desc' },
                take: 5 
            }),
            prisma.artisan.findMany(),
            prisma.lead.aggregate({
                _count: { _all: true }
            }),
            prisma.activityLog.groupBy({
                by: ['category'],
                _count: { _all: true }
            }),
            prisma.activityLog.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: { 
                    user: { select: { name: true, role: true } } 
                }
            }),
            prisma.incident.count() // Pour la variable incidentsTotal
        ]);

        // --- 🟢 TRAITEMENT DES DONNÉES ---
        const totalUsers = userStats.reduce((acc, curr) => acc + curr._count._all, 0);
        const volumeAffaires = revenueAgg._sum.amount || 0;
        const myRevenue = volumeAffaires * 0.05;

        // 🟢 FIX : Calcul des variables manquantes identifiées dans les logs
        const totalInteractions = interactionStats.reduce((acc, curr) => acc + curr._count._all, 0);
        
        // Extraction spécifique pour WhatsApp via les logs d'activité
        const whatsappTotal = await prisma.activityLog.count({
            where: { action: { contains: 'WHATSAPP' } }
        });

        // Liste des propriétaires pour le guichet de rechargement (V4 Ready) 
        const owners = await prisma.user.findMany({
            where: { role: 'OWNER' },
            select: { id: true, name: true, walletBalance: true, isActive: true }
        });

        const leads = await prisma.lead.findMany({ 
            orderBy: { createdAt: 'desc' }, 
            take: 5 
        });

        // 🟢 RENDU DE LA VUE AVEC TOUTES LES VARIABLES
        res.render('dashboard-admin', {
            user: req.session.user,
            totalUsers,
            owners, // Ajouté pour le formulaire de crédit
            agents: [], // À lier à une table Agent si nécessaire
            totalProperties: propertyCount,
            volumeAffaires,
            myRevenue,
            activeIncidents,
            incidentsTotal: incidentsCount, // Correction variable manquante
            totalInteractions, // Correction variable manquante
            whatsappTotal, // Correction variable manquante
            artisans,
            leads,
            leadsCount: leadStats._count._all,
            recentActivities,
            csrfToken: req.csrfToken ? req.csrfToken() : ""
        });

    } catch (error) {
        console.error("🔥 Erreur Critique Dashboard Admin:", error);
        res.status(500).send("Erreur lors de la génération des statistiques.");
    }
};

// --- 🟢 ACTIONS TRÉSORERIE (V4 Ready) ---
exports.postAddCredit = async (req, res) => {
    const { ownerId, amount } = req.body;
    const creditAmount = parseInt(amount);

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
                    description: `Rechargement Admin`,
                    userId: ownerId
                }
            }),
            prisma.activityLog.create({
                data: {
                    action: 'ADMIN_CREDIT_ADD',
                    category: 'FINANCE',
                    userId: req.session.user.id,
                    metadata: { targetUserId: ownerId, amount: creditAmount }
                }
            })
        ]);
        res.redirect('/admin/dashboard?success=credit_added');
    } catch (error) {
        res.redirect('/admin/dashboard?error=transaction_failed');
    }
};

// --- GESTION DES UTILISATEURS & ARTISANS (Inchangé mais sécurisé) ---

exports.postToggleStatus = async (req, res) => {
    const { userId, currentStatus } = req.body;
    const isActive = String(currentStatus) === 'true';
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isActive: !isActive } 
        });
        res.redirect('/admin/dashboard?success=status_updated#users'); 
    } catch (error) {
        res.redirect('/admin/dashboard?error=update_failed');
    }
};

exports.postAddArtisan = async (req, res) => {
    const { name, job, location, phone } = req.body;
    try {
        await prisma.artisan.create({
            data: { name, job, location, phone, isVerified: true }
        });
        res.redirect('/admin/dashboard?success=artisan_created#artisans');
    } catch (error) {
        res.redirect('/admin/dashboard?error=creation_failed');
    }
};

exports.postDeleteArtisan = async (req, res) => {
    const { artisanId } = req.body;
    try {
        await prisma.artisan.delete({ where: { id: artisanId } });
        res.redirect('/admin/dashboard?success=artisan_deleted#artisans');
    } catch (error) {
        res.redirect('/admin/dashboard?error=delete_failed');
    }
};

// --- 🟢 SYSTÈME DE LOGS (Optimisation des performances 404/Lenteur) ---
exports.getLogs = async (req, res) => {
    try {
        const { role, limit } = req.query;
        let whereClause = {};
        
        if (role && role !== 'ALL') {
            whereClause = {
                OR: [
                    { category: role.toUpperCase() },
                    { user: { role: role.toUpperCase() } }
                ]
            };
        }

        const logs = await prisma.activityLog.findMany({
            where: whereClause,
            include: {
                user: { select: { name: true, role: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit ? parseInt(limit) : 50 
        });

        res.render('admin/logs', { 
            logs, 
            currentFilter: role || 'ALL',
            user: req.session.user
        });
    } catch (error) {
        res.status(500).send("Erreur Logs");
    }
};

exports.exportLogsCsv = async (req, res) => {
    try {
        const { role } = req.query;
        let whereClause = role ? { category: role.toUpperCase() } : {};

        const logs = await prisma.activityLog.findMany({
            where: whereClause,
            include: { user: true },
            orderBy: { createdAt: 'desc' },
            take: 1000 // Limite de sécurité pour l'export
        });

        const csvData = logs.map(log => ({
            Date: log.createdAt.toISOString(),
            Utilisateur: log.user ? log.user.name : 'Système',
            Action: log.action,
            Details: log.metadata ? JSON.stringify(log.metadata) : ''
        }));

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(csvData);

        res.header('Content-Type', 'text/csv');
        res.attachment(`audit_immofacile_${Date.now()}.csv`);
        return res.send(csv);
    } catch (error) {
        res.status(500).send("Erreur Export");
    }
};
