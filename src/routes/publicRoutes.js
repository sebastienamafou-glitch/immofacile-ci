const express = require('express');
const router = express.Router();

// 1. Landing Page (Accueil)
router.get('/', (req, res) => {
    res.render('landing', { user: req.session.user });
});

// 2. Page "Notre Tech" (Celle qu'on vient de créer)
router.get('/about-us', (req, res) => {
    res.render('about-tech');
});

// 3. Documents Légaux (Pied de page)
router.get('/terms', (req, res) => res.render('terms'));
router.get('/privacy', (req, res) => res.render('privacy'));
router.get('/cgu', (req, res) => res.render('cgu'));

// 4. Page 404 (Optionnel, souvent géré dans app.js à la fin)
// router.get('*', (req, res) => res.render('404'));

module.exports = router;
