// routes/ownerRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');

// Imports des contrôleurs
const ownerController = require('../controllers/ownerController');
const paymentController = require('../controllers/paymentController');

// Import Middleware unifié (Best Practice)
// Assurez-vous que votre fichier authMiddleware.js exporte bien { isOwner } ou que vous utilisez le bon fichier.
// Ici, je suppose que vous avez un fichier middlewares/auth.js comme vu dans les logs précédents.
const { isOwner } = require('../middlewares/auth'); 
const upload = require('../middlewares/upload'); // Assurez-vous que c'est le bon chemin pour multer/cloudinary

// --- ROUTES D'AFFICHAGE (GET) ---

// Dashboard principal
router.get('/dashboard', isOwner, ownerController.getDashboard);

// Centre d'Aide avec statistiques BI
router.get('/help', isOwner, async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        const statsActions = {
            reminders: await prisma.activityLog.count({ where: { userId, action: "CREDENTIALS_SHARED_WA" } }),
            rentCollected: await prisma.activityLog.count({ where: { userId, action: "RENT_COLLECTED" } }),
            inventory: await prisma.activityLog.count({ where: { userId, action: "INVENTORY_COMPLETED" } })
        };

        res.render('help', { statsActions });
    } catch (error) {
        console.error("Erreur chargement stats help:", error);
        res.render('help', { 
            statsActions: { reminders: 0, rentCollected: 0, inventory: 0 } 
        });
    }
});

// Formulaires et vues simples
router.get('/add-property', isOwner, (req, res) => res.render('add-property')); // Utilise la nouvelle vue corrigée
router.get('/add-tenant', isOwner, ownerController.getAddTenant);

// Documents & Justificatifs PDF
router.get('/contract/:leaseId', isOwner, ownerController.getContract);
router.get('/receipt/:paymentId', isOwner, ownerController.getReceipt);
router.get('/formal-notice/:leaseId', isOwner, ownerController.getFormalNotice);
router.get('/inventory/:leaseId', isOwner, ownerController.getInventory);

// Affiche QR Code (La route qui posait problème est corrigée ici par l'import global de isOwner)
router.get('/property/:id/poster', isOwner, ownerController.generatePoster);

// --- ROUTES D'ACTION (POST) ---

// Gestion des Biens (CORRIGÉ : upload.array pour photos multiples)
router.post('/add-property', isOwner, upload.array('images', 5), ownerController.postAddProperty);

// Gestion des Locataires
router.post('/add-tenant', isOwner, ownerController.postAddTenant);
router.post('/end-lease', isOwner, ownerController.postEndLease);

// États des lieux avec photos multiples
router.post('/submit-inventory', isOwner, upload.fields([
    { name: 'kitchenPhoto', maxCount: 1 },
    { name: 'livingPhoto', maxCount: 1 },
    { name: 'bathPhoto', maxCount: 1 }
]), ownerController.postSubmitInventory);

// Gestion Financière & Incidents
router.post('/add-expense', isOwner, ownerController.postAddExpense);
router.post('/pay-rent', isOwner, paymentController.postPayRent);
router.post('/resolve-incident', isOwner, ownerController.postResolveIncident);
router.post('/add-artisan', isOwner, ownerController.postAddArtisan);

// --- TRACKING WHATSAPP ---
router.get('/track-credentials-share', isOwner, async (req, res) => {
    try {
        const { phone, user, text } = req.query;
        // On suppose que tracker est bien dans utils/tracker.js
        const tracker = require('../utils/tracker'); 

        await tracker.trackAction("CREDENTIALS_SHARED_WA", "OWNER", req.session.user.id, { 
            tenantName: user,
            tenantPhone: phone 
        });

        res.redirect(`https://wa.me/${phone.replace(/\s+/g, '')}?text=${text}`);
    } catch (error) {
        console.error("Erreur tracking WhatsApp:", error);
        res.redirect('/owner/dashboard');
    }
});

module.exports = router;
