// routes/tenantRoutes.js
const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const auth = require('../middleware/authMiddleware');
const tracker = require('../utils/tracker');

// Dashboard Locataire
router.get('/dashboard', auth.isTenant, tenantController.getDashboard);

// Signalement d'incident
// 1. Afficher le formulaire (Manquait dans votre fichier)
router.get('/report-issue', auth.isTenant, (req, res) => res.render('report-issue'));

// 2. Traiter le formulaire
router.post('/report-issue', auth.isTenant, tenantController.postReportIssue);

router.get('/contact-artisan/:id', auth.isTenant, async (req, res) => {
    const { id } = req.params;
    const artisan = await prisma.artisan.findUnique({ where: { id } });
    
    // Enregistrement du clic
    await tracker.trackAction("WHATSAPP_ARTISAN", "TENANT", req.session.user.id, { 
        artisanName: artisan.name,
        job: artisan.job 
    });

    // Redirection vers WhatsApp
    const phone = artisan.phone.replace(/\s+/g, '');
    res.redirect(`https://wa.me/${phone}`);
});

module.exports = router;
