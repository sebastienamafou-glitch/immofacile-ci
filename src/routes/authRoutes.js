// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// --- PAGES PUBLIQUES ---
router.get('/', authController.getLanding);
router.get('/privacy', authController.getPrivacy);
router.get('/cgu', authController.getCGU);

// Routes publiques des biens (Pour les candidats)
router.get('/property/:id', authController.getPublicProperty);
router.post('/apply/:id', authController.postApply);

// --- INSCRIPTION (PROPRIÉTAIRES) ---
router.get('/signup', authController.getSignup);
router.post('/signup', authController.postSignup);

// --- CONNEXION (TOUS ROLES) ---
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

// --- DÉCONNEXION ---
router.get('/logout', authController.logout);

// --- LEAD MAGNET ---
router.post('/register', authController.postRegisterLead);

// --- RÉCUPÉRATION MOT DE PASSE ---
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);

router.get('/reset-password/:token', authController.getResetPassword);
router.post('/reset-password/:token', authController.postResetPassword);

module.exports = router;
