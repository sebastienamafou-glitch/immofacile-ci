const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { isOwner } = require('../middleware/authMiddleware'); // Protection

// 1. Initialiser le paiement (Bouton "Recharger" du dashboard)
// Route: POST /api/payment/recharge
router.post('/recharge', isOwner, paymentController.initCinetPay);

// 2. Webhook (Notification silencieuse de CinetPay)
// Route: POST /api/payment/notify
// IMPORTANT : Pas de middleware CSRF ici (géré dans csrfMiddleware.js via l'exclusion)
router.post('/notify', paymentController.webhookCinetPay);

// 3. Encaissement manuel d'un loyer (si besoin, déjà dans votre controller)
// Route: POST /api/payment/pay-rent
router.post('/pay-rent', isOwner, paymentController.postPayRent);

// Route pour payer les frais
router.post('/pay-fees', isTenant, paymentController.payApplicationFees);

module.exports = router;
