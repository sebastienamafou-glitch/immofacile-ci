const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');

// Sécurité Globale : Tout ce qui est en dessous est PROTÉGÉ
router.use(auth.isAdmin);

// --- DASHBOARD ---
router.get('/dashboard', adminController.getDashboard);

// 🟢 CORRECTION 404 : Redirection si l'utilisateur tape l'ancien lien des logs
router.get('/dashboard-admin', (req, res) => res.redirect('/admin/dashboard'));

// --- TRÉSORERIE & UTILISATEURS ---
router.post('/add-credit', adminController.postAddCredit);
router.post('/toggle-status', adminController.postToggleStatus);

// --- ARTISANS ---
router.post('/add-artisan', adminController.postAddArtisan);
router.post('/delete-artisan', adminController.postDeleteArtisan);

// --- LOGS & AUDIT ---
// Vérifiez que vos liens sidebar pointent bien vers /admin/logs et non /admin/dashboard#logs
router.get('/logs', adminController.getLogs);
router.get('/logs/export', adminController.exportLogsCsv);

module.exports = router;
