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
        // 🟢 Correction : Tous les appels asynchrones sont groupés dans le Dispatcher
        const data = await Dispatcher.runParallel({
            users: prisma.user.count(),
            properties: prisma.property.count(),
            unpaidBails: prisma.lease.count({ where: { status: 'PENDING_FEES' } }),
            // Ajout du compteur de baux scellés V4 identifié dans les logs
            sealedBails: prisma.lease.count({ where: { NOT: { signatureHash: null } } }),
            dbTime: prisma.$queryRaw`SELECT NOW()`
        });

        res.json({
            success: true,
            timestamp: new Date(),
            region: "iad1", // Région confirmée dans les logs
            stats: data
        });
    } catch (error) {
        console.error("Erreur Dispatcher Route:", error);
        res.status(500).json({ error: "Erreur lors du dispatch système" });
    }
});

module.exports = router;
