// routes/tenantRoutes.js
const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const auth = require('../middleware/authMiddleware');

// Dashboard Locataire
router.get('/dashboard', auth.isTenant, tenantController.getDashboard);

// Signalement d'incident
// 1. Afficher le formulaire (Manquait dans votre fichier)
router.get('/report-issue', auth.isTenant, (req, res) => res.render('report-issue'));

// 2. Traiter le formulaire
router.post('/report-issue', auth.isTenant, tenantController.postReportIssue);

module.exports = router;
