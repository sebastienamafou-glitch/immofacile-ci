require('dotenv').config(); // Charge les variables d'environnement en premier

const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const csrfMiddleware = require('./middleware/csrfMiddleware');
const helmet = require('helmet'); 
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);

// --- SERVICES ---
// Correction de la ligne 9 : Syntaxe corrigée pour lancer le script cron
require('./services/cronService');

// --- IMPORTS DES ROUTES ---
const authRoutes = require('./routes/authRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const adminRoutes = require('./routes/adminRoutes');
const agentRoutes = require('./routes/agentRoutes');
const apiRoutes = require('./routes/apiRoutes');
const investorRoutes = require('./routes/investorRoutes');
const artisanRoutes = require('./routes/artisanRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Configuration Proxy
app.set('trust proxy', 1); 

// Sécurité Helmet
app.use(helmet({
  contentSecurityPolicy: false, 
}));

// Configuration des Vues (EJS)
app.set('view engine', 'ejs');
// On suppose que vos vues sont dans 'src/views' (car app.js est dans src)
app.set('views', path.join(__dirname, 'views'));

// Configuration des Fichiers Statiques
// 'public' est à la racine, donc on remonte d'un niveau (..) depuis 'src'
app.use(express.static(path.join(__dirname, '..', 'public')));

// Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Base de données
const pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: IS_PROD ? { rejectUnauthorized: false } : false
});

// Session
app.use(session({
    store: new pgSession({
        pool : pgPool,
        tableName : 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'secret_dev_key_immofacile',
    resave: false,
    saveUninitialized: false,
    name: 'immofacile_sid',
    cookie: { 
        secure: IS_PROD, 
        httpOnly: true,  
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// Middleware CSRF & Variables Locales
app.use(csrfMiddleware);

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.csrfToken = (typeof req.csrfToken === 'function') ? req.csrfToken() : null;
    next();
});

// --- DÉFINITION DES ROUTES ---

// Route publique CGU
app.get('/terms', (req, res) => {
    res.render('terms'); 
});

// Routes principales
app.use('/', authRoutes);
app.use('/owner', ownerRoutes);
app.use('/tenant', tenantRoutes);
app.use('/admin', adminRoutes);
app.use('/agent', agentRoutes);
app.use('/api', apiRoutes);
app.use('/investor', investorRoutes);
app.use('/artisan', artisanRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/chat', chatRoutes);


// --- GESTION DES ERREURS ---
app.use((req, res) => {
    // Vérifiez que 'views/errors/404.ejs' existe bien
    res.status(404).render('errors/404');
});

// Démarrage du serveur
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✅ ImmoFacile-CI opérationnel sur le port ${PORT}`);
    });
}

module.exports = app;
