// routes/ownerRoutes.js
const express = require('express');
const router = express.Router();

// Imports des contrôleurs
const ownerController = require('../controllers/ownerController');
const paymentController = require('../controllers/paymentController'); // Nécessaire pour encaisser les loyers

// Import du Middleware
const auth = require('../middleware/authMiddleware');

// --- ROUTES D'AFFICHAGE (GET) ---

// Dashboard
router.get('/dashboard', auth.isOwner, ownerController.getDashboard);

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

// Gestion Financière (Dépenses & Recettes)
router.post('/add-expense', auth.isOwner, ownerController.postAddExpense);
router.post('/pay-rent', auth.isOwner, paymentController.postPayRent); // Utilise le paymentController

// Gestion Incidents & Artisans
router.post('/resolve-incident', auth.isOwner, ownerController.postResolveIncident);
router.post('/add-artisan', auth.isOwner, ownerController.postAddArtisan);

module.exports = router;
