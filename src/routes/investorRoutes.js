// src/routes/investorRoutes.js
const express = require('express');
const router = express.Router();
const investorController = require('../controllers/investorController');
const auth = require('../middleware/authMiddleware'); // Assurez-vous d'avoir un middleware isInvestor

// Middleware de sécurité spécifique (si vous ne l'avez pas déjà dans authMiddleware)
const isInvestor = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'INVESTOR' || req.session.user.role === 'ADMIN')) {
        return next();
    }
    return res.redirect('/auth/login');
};

// Routes
router.get('/dashboard', isInvestor, investorController.getDashboard);
router.get('/opportunities', isInvestor, investorController.getOpportunities);

module.exports = router;
