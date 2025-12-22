// routes/ownerRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client'); // Importation cruciale pour les stats

// Imports des contrôleurs
const ownerController = require('../controllers/ownerController');
const paymentController = require('../controllers/paymentController');
const { isOwner } = require('../middlewares/auth');


// Import du Middleware
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// --- ROUTES D'AFFICHAGE (GET) ---

// Dashboard principal
router.get('/dashboard', auth.isOwner, ownerController.getDashboard);

// Centre d'Aide avec statistiques BI (Route Unique et Nettoyée)
router.get('/help', auth.isOwner, async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Récupération des compteurs d'activité pour ce propriétaire
        const statsActions = {
            reminders: await prisma.activityLog.count({ where: { userId, action: "CREDENTIALS_SHARED_WA" } }),
            rentCollected: await prisma.activityLog.count({ where: { userId, action: "RENT_COLLECTED" } }),
            inventory: await prisma.activityLog.count({ where: { userId, action: "INVENTORY_COMPLETED" } })
        };

        res.render('help', { statsActions });
    } catch (error) {
        console.error("Erreur chargement stats help:", error);
        // Fallback pour éviter le plantage si la table activityLog est vide
        res.render('help', { 
            statsActions: { reminders: 0, rentCollected: 0, inventory: 0 } 
        });
    }
});

// Formulaires et vues simples
router.get('/add-property', auth.isOwner, (req, res) => res.render('add-property'));
router.get('/add-tenant', auth.isOwner, ownerController.getAddTenant);

// Documents & Justificatifs PDF
router.get('/contract/:leaseId', auth.isOwner, ownerController.getContract);
router.get('/receipt/:paymentId', auth.isOwner, ownerController.getReceipt);
router.get('/formal-notice/:leaseId', auth.isOwner, ownerController.getFormalNotice);
router.get('/inventory/:leaseId', auth.isOwner, ownerController.getInventory);
router.get('/property/:id/poster', isOwner, ownerController.generatePoster);

// --- ROUTES D'ACTION (POST) ---

// Gestion des Biens & Locataires
router.post('/add-property', auth.isOwner, upload.single('image'), ownerController.postAddProperty);
router.post('/add-tenant', auth.isOwner, ownerController.postAddTenant);
router.post('/end-lease', auth.isOwner, ownerController.postEndLease);

// États des lieux avec photos multiples
router.post('/submit-inventory', auth.isOwner, upload.fields([
    { name: 'kitchenPhoto', maxCount: 1 },
    { name: 'livingPhoto', maxCount: 1 },
    { name: 'bathPhoto', maxCount: 1 }
]), ownerController.postSubmitInventory);

// Gestion Financière & Incidents
router.post('/add-expense', auth.isOwner, ownerController.postAddExpense);
router.post('/pay-rent', auth.isOwner, paymentController.postPayRent);
router.post('/resolve-incident', auth.isOwner, ownerController.postResolveIncident);
router.post('/add-artisan', auth.isOwner, ownerController.postAddArtisan);

// --- TRACKING WHATSAPP ---

// Route intermédiaire pour enregistrer le partage des accès
router.get('/track-credentials-share', auth.isOwner, async (req, res) => {
    try {
        const { phone, user, text } = req.query;
        const tracker = require('../utils/tracker');

        // Enregistrement de l'action pour les statistiques
        await tracker.trackAction("CREDENTIALS_SHARED_WA", "OWNER", req.session.user.id, { 
            tenantName: user,
            tenantPhone: phone 
        });

        // Redirection vers l'API WhatsApp
        res.redirect(`https://wa.me/${phone.replace(/\s+/g, '')}?text=${text}`);
    } catch (error) {
        console.error("Erreur tracking WhatsApp:", error);
        res.redirect('/owner/dashboard');
    }
});

module.exports = router;
