// src/routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client'); // 🟢 Nécessaire pour charger les biens
const tracker = require('../utils/tracker'); // 🟢 Pour tracker les vues

// 1. Landing Page (Accueil)
router.get('/', (req, res) => {
    res.render('landing', { user: req.session.user });
});

// 2. Page "Notre Tech"
router.get('/about-us', (req, res) => {
    res.render('about-tech');
});

// 3. Documents Légaux
router.get('/terms', (req, res) => res.render('terms'));
router.get('/privacy', (req, res) => res.render('privacy'));
router.get('/cgu', (req, res) => res.render('cgu'));

// --- ROUTES AJOUTÉES (Manquantes pour V4) ---

// 4. Détail d'un bien (Public / QR Code)
router.get('/property/:id', async (req, res) => {
    try {
        const property = await prisma.property.findUnique({
            where: { id: req.params.id }
        });

        if (!property) return res.status(404).render('errors/404');

        // Tracking : On compte une "Vue" sur ce bien
        // On ne bloque pas l'affichage si le tracking échoue
        tracker.trackAction("PROPERTY_VIEWED", "PUBLIC", null, { propertyId: property.id }).catch(console.error);

        res.render('public-property', { 
            property,
            // Le CSRF est géré globalement via res.locals dans app.js, 
            // mais on peut le passer explicitement si besoin :
            csrfToken: req.csrfToken ? req.csrfToken() : "" 
        });

    } catch (error) {
        console.error("Erreur page bien:", error);
        res.status(500).render('errors/404'); // Fallback propre
    }
});

// 5. Traitement Candidature (Formulaire Public)
router.post('/apply/:id', async (req, res) => {
    try {
        const { name, phone, email, income } = req.body;
        const propertyId = req.params.id;

        // Création du Lead / Candidat
        // Note: Dans une V5, on créerait un vrai compte User 'TENANT' ici.
        // Pour la V4, on stocke juste l'intérêt ou on notifie le proprio.
        
        await prisma.lead.create({
            data: {
                name,
                phone,
                email,
                income: parseInt(income),
                propertyId
            }
        });

        // Notification (Simulée ou via pushService si implémenté pour les leads)
        console.log(`📬 Nouvelle candidature pour le bien ${propertyId} de ${name}`);

        res.render('public-property', { 
            property: await prisma.property.findUnique({ where: { id: propertyId } }),
            success: "Votre dossier a été transmis au propriétaire !",
            csrfToken: req.csrfToken()
        });

    } catch (error) {
        console.error("Erreur candidature:", error);
        res.redirect(`/property/${req.params.id}?error=apply_failed`);
    }
});

module.exports = router;
