const express = require('express');
const router = express.Router();
const investorController = require('../controllers/investorController');

// Middleware pour vérifier si c'est un investisseur
const isInvestor = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'INVESTOR') {
        return next();
    }
    // Si c'est un proprio qui veut voir, on peut être souple ou rediriger
    if (req.session.user) return next(); 
    res.redirect('/login');
};

router.get('/dashboard', isInvestor, investorController.getDashboard);
// router.get('/opportunities', isInvestor, investorController.getOpportunities); // À faire plus tard

module.exports = router;
