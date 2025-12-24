// routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client'); // Nécessaire pour les requêtes DB
const aiController = require('../controllers/aiController');
const { isOwner } = require('../middleware/authMiddleware');
const serviceController = require('../controllers/serviceController');

// Import des contrôleurs
const paymentController = require('../controllers/paymentController');

// --- 1. PAIEMENTS (WEBHOOKS) ---

// Notification CinetPay
// Cette route reçoit les confirmations de paiement des serveurs CinetPay
router.post('/payment/notify', paymentController.webhookCinetPay);

// --- 2. API UTILITAIRES (DONNÉES PUBLIQUES) ---

/**
 * GET /api/communes
 * Récupère la liste unique des communes où des biens sont enregistrés.
 * Usage : Pour remplir les <select> de recherche en frontend via AJAX.
 */
router.get('/communes', async (req, res) => {
    try {
        const locations = await prisma.property.findMany({
            select: { commune: true },
            distinct: ['commune'], // Évite les doublons (ex: 10 fois "Cocody" -> 1 fois "Cocody")
            orderBy: { commune: 'asc' }
        });
        
        // On renvoie juste un tableau de strings : ["Cocody", "Marcory", "Yopougon"]
        res.json(locations.map(loc => loc.commune));
    } catch (error) {
        console.error("API Error (Communes):", error);
        res.status(500).json({ error: "Impossible de récupérer les communes" });
    }
});

/**
 * GET /api/property/:id/status
 * Vérifie si un bien est actuellement occupé ou disponible.
 * Usage : Pour afficher un badge "LOUÉ" en temps réel sur la page publique.
 */
router.get('/property/:id/status', async (req, res) => {
    try {
        const { id } = req.params;

        // On cherche s'il existe un bail ACTIF pour ce bien
        const activeLease = await prisma.lease.findFirst({
            where: {
                propertyId: id,
                isActive: true
            }
        });

        if (activeLease) {
            res.json({ status: 'OCCUPIED', message: 'Ce bien est actuellement loué.' });
        } else {
            res.json({ status: 'AVAILABLE', message: 'Ce bien est disponible.' });
        }

    } catch (error) {
        console.error("API Error (Status):", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Route pour générer la description (Protégée propriétaire)
router.post('/ai/generate-ad', isOwner, aiController.generateDescription);

// Route pour le Chatbot Juridique
router.post('/ai/legal-help', isOwner, aiController.askLegalBot);

// Route pour trouver un agent
router.post('/services/request-agent', isOwner, serviceController.requestAgent);

// Route pour virer un agent
router.post('/services/revoke-agent', isOwner, serviceController.revokeAgent);

module.exports = router;
