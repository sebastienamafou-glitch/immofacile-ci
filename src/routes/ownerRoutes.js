// routes/ownerRoutes.js
const express = require('express');
const router = express.Router();

// Imports des contrôleurs
const ownerController = require('../controllers/ownerController');
const paymentController = require('../controllers/paymentController'); // Nécessaire pour encaisser les loyers

// Import du Middleware
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Ton fichier corrigé

// --- ROUTES D'AFFICHAGE (GET) ---

// Dashboard
router.get('/dashboard', auth.isOwner, ownerController.getDashboard);
router.get('/help', auth.isOwner, (req, res) => res.render('help'));

// Formulaires d'ajout (Affichage simple)
// Note: Pour add-tenant, il faudra idéalement créer une fonction dans le contrôleur pour passer la liste des propriétés
router.get('/add-property', auth.isOwner, (req, res) => res.render('add-property'));
router.get('/add-tenant', auth.isOwner, ownerController.getAddTenant); // À ajouter dans le contrôleur

// Documents & Justificatifs
router.get('/contract/:leaseId', auth.isOwner, ownerController.getContract); // À ajouter
router.get('/receipt/:paymentId', auth.isOwner, ownerController.getReceipt); // À ajouter
router.get('/formal-notice/:leaseId', auth.isOwner, ownerController.getFormalNotice); // À ajouter
router.get('/inventory/:leaseId', auth.isOwner, ownerController.getInventory); // À ajouter

// --- ROUTES D'ACTION (POST) ---

// Gestion des Biens & Locataires
router.post('/add-property', auth.isOwner, ownerController.postAddProperty);
router.post('/add-tenant', auth.isOwner, ownerController.postAddTenant);
router.post('/end-lease', auth.isOwner, ownerController.postEndLease); // Manquait dans votre fichier
router.post('/submit-inventory', auth.isOwner, upload.fields([
    { name: 'kitchenPhoto', maxCount: 1 },
    { name: 'livingPhoto', maxCount: 1 },
    { name: 'bathPhoto', maxCount: 1 }
]), ownerController.postSubmitInventory);

// Gestion Financière (Dépenses & Recettes)
router.post('/add-expense', auth.isOwner, ownerController.postAddExpense);
router.post('/pay-rent', auth.isOwner, paymentController.postPayRent); // Utilise le paymentController

// Gestion Incidents & Artisans
router.post('/resolve-incident', auth.isOwner, ownerController.postResolveIncident);
router.post('/add-artisan', auth.isOwner, ownerController.postAddArtisan);

router.post('/add-property', upload.single('image'), ownerController.postAddProperty);

// Route intermédiaire pour enregistrer le partage des accès
router.get('/track-credentials-share', auth.isOwner, async (req, res) => {
    const { phone, user, text } = req.query;
    const tracker = require('../utils/tracker');

    // 1. On enregistre l'action dans les logs d'activité
    await tracker.trackAction("CREDENTIALS_SHARED_WA", "OWNER", req.session.user.id, { 
        tenantName: user,
        tenantPhone: phone 
    });

    // 2. On redirige vers WhatsApp avec le message déjà préparé
    res.redirect(`https://wa.me/${phone.replace(/\s+/g, '')}?text=${text}`);
});

router.get('/help', auth.isOwner, async (req, res) => {
    const userId = req.session.user.id;
    
    // Récupération des compteurs d'activité pour ce propriétaire
    const statsActions = {
        reminders: await prisma.activityLog.count({ where: { userId, action: "CREDENTIALS_SHARED_WA" } }),
        rentCollected: await prisma.activityLog.count({ where: { userId, action: "RENT_COLLECTED" } }),
        inventory: await prisma.activityLog.count({ where: { userId, action: "INVENTORY_COMPLETED" } })
    };

    res.render('help', { statsActions });
});

module.exports = router;
