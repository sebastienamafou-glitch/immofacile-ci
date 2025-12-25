require('dotenv').config(); // Charge les variables d'environnement en premier

const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const csrfMiddleware = require('./middleware/csrfMiddleware');
const helmet = require('helmet'); 
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit'); // 🟢 1. IMPORT DU LIMITEUR
const signatureRoutes = require('./routes/signatureRoutes');

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
const publicRoutes = require('./routes/publicRoutes');
const cronRoutes = require('./routes/cronRoutes'); // Route pour le Cron Vercel

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Configuration Proxy (Nécessaire pour Vercel/Heroku et le Rate Limiting)
app.set('trust proxy', 1); 

// --- SÉCURITÉ HELMET (Audit Validé ✅) ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        
        // Scripts autorisés (Frontend, CinetPay, Analytics...)
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Requis pour les scripts dans les vues EJS
          "cdn.tailwindcss.com",
          "unpkg.com",         // Phosphor Icons / Leaflet
          "cdn.jsdelivr.net",  // Chart.js / SweetAlert2
          "checkout.cinetpay.com"
        ],
        
        // Styles autorisés
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "fonts.googleapis.com",
          "cdn.jsdelivr.net",
          "unpkg.com"
        ],
        
        // Images autorisées (Cloudinary, Cartes, QR Codes base64)
        imgSrc: [
          "'self'",
          "data:",
          "res.cloudinary.com", 
          "*.openstreetmap.org",
          "tile.openstreetmap.org"
        ],
        
        // Connexions API autorisées (CinetPay, Mindee, OpenAI)
        connectSrc: [
          "'self'",
          "api-checkout.cinetpay.com",
          "api.mindee.net",
          "api.openai.com",
          "overpass-api.de"
        ],
        
        // iFrames autorisées (Widget de paiement)
        frameSrc: [
          "'self'",
          "checkout.cinetpay.com"
        ],
        
        fontSrc: [
          "'self'",
          "fonts.gstatic.com"
        ],
        
        upgradeInsecureRequests: [], 
      },
    },
    // Désactive cette policy spécifique si elle bloque le chargement d'images cross-origin
    crossOriginEmbedderPolicy: false, 
  })
);

// Configuration des Vues (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuration des Fichiers Statiques
app.use(express.static(path.join(__dirname, '..', 'public')));

// Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Base de données (Pooling)
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
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
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

// --- 🟢 2. CONFIGURATION DU BOUCLIER OPENAI ---
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure (en millisecondes)
    max: 5, // Max 5 requêtes par IP par heure
    message: { 
        status: 429,
        error: "Quota IA dépassé. Veuillez réessayer dans une heure pour générer une nouvelle annonce." 
    },
    standardHeaders: true, 
    legacyHeaders: false,
});

// --- DÉFINITION DES ROUTES ---

// Route publique CGU
app.get('/terms', (req, res) => {
    res.render('terms'); 
});

// 🟢 3. APPLICATION DU BOUCLIER (Protège les routes /api/ai)
app.use('/api/ai', aiLimiter);

// Routes Applicatives
app.use('/', authRoutes);
app.use('/owner', ownerRoutes);
app.use('/tenant', tenantRoutes);
app.use('/admin', adminRoutes);
app.use('/agent', agentRoutes);
app.use('/investor', investorRoutes);
app.use('/artisan', artisanRoutes);
app.use('/chat', chatRoutes);
app.use('/api/signature', signatureRoutes);

// Routes API & Systèmes
app.use('/api', apiRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/cron', cronRoutes); // Route Cron sécurisée

// Routes Publiques (Landing page, etc.)
app.use('/', publicRoutes);

// --- GESTION DES ERREURS ---
app.use((req, res) => {
    res.status(404).render('errors/404');
});

// Démarrage du serveur
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✅ ImmoFacile-CI V3 opérationnel sur le port ${PORT}`);
    });
}

module.exports = app;
