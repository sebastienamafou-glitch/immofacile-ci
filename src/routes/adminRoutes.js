// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');

// Sécurité : Toutes les routes nécessitent d'être ADMIN
router.use(auth.isAdmin);

// --- DASHBOARD ---
router.get('/dashboard', adminController.getDashboard);

// --- ACTIONS TRÉSORERIE ---
router.post('/add-credit', adminController.postAddCredit);
router.post('/toggle-status', adminController.postToggleStatus);

// --- GESTION ARTISANS ---
router.post('/add-artisan', adminController.postAddArtisan);
router.post('/delete-artisan', adminController.postDeleteArtisan);

module.exports = router;
