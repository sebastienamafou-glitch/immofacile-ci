const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const csrfMiddleware = require('./middleware/csrfMiddleware');
// Ajout pour la persistance des sessions
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);

// --- 1. CHARGEMENT DES VARIABLES D'ENVIRONNEMENT ---
require('dotenv').config();

// --- 2. IMPORTS DES ROUTES ---
const authRoutes = require('./routes/authRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const adminRoutes = require('./routes/adminRoutes');
const agentRoutes = require('./routes/agentRoutes');
const apiRoutes = require('./routes/apiRoutes');

// --- 3. INITIALISATION ---
const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// --- 4. CONFIGURATION MOTEUR DE VUE ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- 5. MIDDLEWARES DE BASE & FICHIERS STATIQUES ---
// Note : Placé avant les routes pour éviter les erreurs 404 (Type text/html) sur les images
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// --- 6. SESSION (PERSISTANTE AVEC POSTGRESQL) ---
// Création du pool de connexion PostgreSQL dédié aux sessions
const pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: IS_PROD ? { rejectUnauthorized: false } : false // Nécessaire pour Render/Heroku/Neon en prod
});

app.use(session({
    store: new pgSession({
        pool : pgPool,                // Utilise notre connexion existante
        tableName : 'session',        // Nom de la table en BDD
        createTableIfMissing: true    // CRUCIAL : Crée la table automatiquement si elle n'existe pas
    }),
    secret: process.env.SESSION_SECRET || 'secret_dev_key_immofacile',
    resave: false,
    saveUninitialized: false,
    name: 'immofacile_sid',
    cookie: { 
        secure: IS_PROD, 
        httpOnly: true,  
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours (Plus confortable pour une app mobile)
        sameSite: 'lax'
    }
}));

// --- 7. SÉCURITÉ CSRF ---
// Gère les exclusions (API, Uploads) via le middleware modulaire
app.use(csrfMiddleware);

// --- 8. VARIABLES GLOBALES (POUR LES VUES EJS) ---
app.use((req, res, next) => {
    // Utilisateur en session
    res.locals.user = req.session.user || null;
    
    // Token CSRF : On vérifie s'il est disponible (exclu sur certaines routes API)
    res.locals.csrfToken = (typeof req.csrfToken === 'function') ? req.csrfToken() : null;
    
    next();
});

// --- 9. MONTAGE DES ROUTES ---

// A. Routes Publiques & Authentification (Inclus Password Reset)
app.use('/', authRoutes);

// B. Espaces Utilisateurs (Protégés par rôles)
app.use('/owner', ownerRoutes);
app.use('/tenant', tenantRoutes);
app.use('/admin', adminRoutes);
app.use('/agent', agentRoutes);

// C. API & Webhooks (CinetPay, Utils)
app.use('/api', apiRoutes);

// --- 10. GESTION DES ERREURS 404 ---
app.use((req, res) => {
    res.status(404).render('404');
});

// --- 11. DÉMARRAGE SERVEUR ---
app.listen(PORT, () => {
    console.log(`✅ ImmoFacile-CI opérationnel sur http://localhost:${PORT}`);
    console.log(`🔒 Mode: ${IS_PROD ? 'Production (HTTPS)' : 'Développement'}`);
    console.log(`💾 Session Store: PostgreSQL`);
    console.log(`📂 Dossiers statiques configurés : /public`);
});
