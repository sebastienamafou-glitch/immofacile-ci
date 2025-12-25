// src/routes/investorRoutes.js
const express = require('express');
const router = express.Router();
const investorController = require('../controllers/investorController');
const auth = require('../middleware/authMiddleware');

/**
 * Middleware de sécurité local pour filtrage par rôle
 * Autorise INVESTOR et ADMIN (pour supervision)
 */
const isInvestor = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'INVESTOR' || req.session.user.role === 'ADMIN')) {
        return next();
    }
    return res.redirect('/auth/login');
};

// --- ROUTES ---

// Dashboard : Calculs ROI via agrégation SQL
router.get('/dashboard', isInvestor, investorController.getDashboard);

// Opportunités : Liste des projets immobiliers
router.get('/opportunities', isInvestor, investorController.getOpportunities);

// Export : Téléchargement des relevés financiers (V4)
router.get('/export', isInvestor, investorController.exportInvestments);

module.exports = router;
