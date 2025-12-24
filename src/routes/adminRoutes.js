const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
// On importe une seule fois
const auth = require('../middleware/authMiddleware');

// Sécurité Globale : Tout ce qui est en dessous est PROTÉGÉ
router.use(auth.isAdmin);

// --- ROUTES (Plus besoin de répéter 'auth.isAdmin' ici) ---

router.get('/dashboard', adminController.getDashboard);

router.post('/add-credit', adminController.postAddCredit);
router.post('/toggle-status', adminController.postToggleStatus);

router.post('/add-artisan', adminController.postAddArtisan);
router.post('/delete-artisan', adminController.postDeleteArtisan);

// La protection de la ligne 9 s'applique aussi ici automatiquement !
router.get('/logs', adminController.getLogs);
router.get('/logs/export', adminController.exportLogsCsv);

module.exports = router;
