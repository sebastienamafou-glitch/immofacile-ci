// src/controllers/adminController.js
const prisma = require('../prisma/client');
const { Parser } = require('json2csv');

exports.getDashboard = async (req, res) => {
    try {
        // --- 🟢 OPTIMISATION V4 : EXÉCUTION PARALLÈLE (Vitesse accrue) ---
        // On délègue les calculs lourds à la base de données PostgreSQL
        const [
            userStats, 
            propertyCount, 
            revenueAgg, 
            activeIncidents,
            artisans,
            leadStats,
            interactionStats,
            recentActivities
        ] = await Promise.all([
            // 1. Statistiques Utilisateurs (Global + par rôle)
            prisma.user.groupBy({
                by: ['role'],
                _count: { _all: true }
            }),
            
            // 2. Nombre de Biens
            prisma.property.count(),
            
            // 3. Agrégation Financière (Volume d'Affaires)
            prisma.payment.aggregate({
                _sum: { amount: true }
            }),

            // 4. Incidents prioritaires (Take 5 pour la rapidité)
            prisma.incident.findMany({
                where: { status: { not: 'RESOLVED' } },
                include: { property: true },
                orderBy: { createdAt: 'desc' },
                take: 5 
            }),

            // 5. Artisans
            prisma.artisan.findMany(),

            // 6. Prospects (Count + Take 5)
            prisma.lead.aggregate({
                _count: { _all: true }
            }),

            // 7. Business Intelligence (Interaction Logs)
            prisma.activityLog.groupBy({
                by: ['category'],
                _count: { _all: true }
            }),

            // 8. Flux Live (Optimisé à 10 actions avec sélection de champs)
            prisma.activityLog.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: { 
                    user: { 
                        select: { name: true, role: true } 
                    } 
                }
            })
        ]);

        // --- 🟢 TRAITEMENT DES DONNÉES (Zéro boucle lourde) ---
        const totalUsers = userStats.reduce((acc, curr) => acc + curr._count._all, 0);
        const volumeAffaires = revenueAgg._sum.amount || 0;
        const myRevenue = volumeAffaires * 0.05;

        // Récupération des leads via Promise result
        const leads = await prisma.lead.findMany({ 
            orderBy: { createdAt: 'desc' }, 
            take: 5 
        });

        // 🟢 Conversion des stats de logs pour la vue
        const whatsappTotal = await prisma.activityLog.count({
            where: { action: { contains: 'WHATSAPP' } }
        });

        res.render('dashboard-admin', {
            user: req.session.user,
            totalUsers,
            owners: userStats.find(u => u.role === 'OWNER')?._count._all || 0,
            agents: userStats.find(u => u.role === 'AGENT')?._count._all || 0,
            totalProperties: propertyCount,
            volumeAffaires,
            myRevenue,
            activeIncidents,
            artisans,
            leads,
            leadsCount: leadStats._count._all,
            logsByCategory: interactionStats,
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
    const creditAmount = parseInt(amount); // Utilisation d'entiers pour les XOF

    if (isNaN(creditAmount) || creditAmount <= 0) {
        return res.redirect('/admin/dashboard?error=invalid_amount');
    }

    try {
        // Transaction ACID pour garantir l'intégrité financière (Audit Validé ✅)
        await prisma.$transaction([
            prisma.user.update({
                where: { id: ownerId },
                data: { walletBalance: { increment: creditAmount } }
            }),
            prisma.creditTransaction.create({
                data: {
                    amount: creditAmount,
                    description: `Rechargement Admin (${req.session.user?.name || 'Admin'})`,
                    userId: ownerId
                }
            }),
            // Traçabilité V4
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
        console.error("Erreur Trésorerie:", error);
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
