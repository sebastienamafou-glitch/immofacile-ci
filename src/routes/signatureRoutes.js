// src/routes/signatureRoutes.js
const express = require('express');
const router = express.Router();
const signatureController = require('../controllers/signatureController');

// Middleware simple pour vérifier si l'utilisateur est connecté
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ error: "Veuillez vous connecter pour signer." });
};

/**
 * @route   POST /api/signature/initiate
 * @desc    Génère le Hash du bail et envoie l'OTP au signataire
 */
router.post('/initiate', isAuthenticated, signatureController.initiateSignature);

/**
 * @route   POST /api/signature/verify
 * @desc    Vérifie l'OTP saisi par l'utilisateur et scelle le document
 */
router.post('/verify', isAuthenticated, signatureController.verifyAndSign);

module.exports = router;
