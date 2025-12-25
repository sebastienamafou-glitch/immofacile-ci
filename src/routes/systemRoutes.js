// src/routes/systemRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const Dispatcher = require('../utils/dispatcher');
const auth = require('../middleware/authMiddleware');

/**
 * @route   GET /api/system/status
 * @desc    Retourne un état global rapide du système via exécution parallèle
 */
router.get('/status', auth.isAdmin, async (req, res) => {
    try {
        // Utilisation du Dispatcher pour éviter les requêtes séquentielles lentes
        const data = await Dispatcher.runParallel({
            users: prisma.user.count(),
            properties: prisma.property.count(),
            unpaidBails: prisma.lease.count({ where: { status: 'PENDING_FEES' } }),
            dbTime: prisma.$queryRaw`SELECT NOW()`
        });

        res.json({
            success: true,
            timestamp: new Date(),
            region: "iad1", // Région identifiée dans les logs
            stats: data
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors du dispatch système" });
    }
});

module.exports = router;
