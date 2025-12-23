const express = require('express');
const router = express.Router();
const investorController = require('../controllers/investorController');

// Middleware simple pour vérifier le rôle (à adapter selon votre authMiddleware.js)
const isInvestor = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'INVESTOR') {
        return next();
    }
    res.redirect('/login');
};

router.get('/dashboard', isInvestor, investorController.getDashboard);
router.get('/opportunities', isInvestor, investorController.getOpportunities);

module.exports = router;
