require('dotenv').config(); 

const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const csrfMiddleware = require('./middleware/csrfMiddleware');
const helmet = require('helmet'); 
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit'); 
const auth = require('./middleware/authMiddleware');

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
const cronRoutes = require('./routes/cronRoutes'); 
const systemRoutes = require('./routes/systemRoutes'); 
const signatureRoutes = require('./routes/signatureRoutes');
const exportController = require('./controllers/exportController');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1); 

// --- SÉCURITÉ HELMET ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com", "unpkg.com", "cdn.jsdelivr.net", "checkout.cinetpay.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.jsdelivr.net", "unpkg.com"],
        imgSrc: ["'self'", "data:", "res.cloudinary.com", "*.openstreetmap.org", "tile.openstreetmap.org"],
        connectSrc: ["'self'", "api-checkout.cinetpay.com", "api.mindee.net", "api.openai.com", "overpass-api.de"],
        frameSrc: ["'self'", "checkout.cinetpay.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        upgradeInsecureRequests: [], 
      },
    },
    crossOriginEmbedderPolicy: false, 
  })
);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: IS_PROD ? { rejectUnauthorized: false } : false
});

app.use(session({
    store: new pgSession({ pool : pgPool, tableName : 'session', createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'secret_dev_key_immofacile',
    resave: false,
    saveUninitialized: false,
    name: 'immofacile_sid',
    cookie: { secure: IS_PROD, httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax' }
}));

app.use(csrfMiddleware);

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.csrfToken = (typeof req.csrfToken === 'function') ? req.csrfToken() : null;
    next();
});

const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 5,
    message: { status: 429, error: "Quota IA dépassé." },
    standardHeaders: true, 
    legacyHeaders: false,
});

// --- ROUTES ---

// Pages Publiques & Légales
app.get('/terms', (req, res) => res.render('terms'));

// ✅ ROUTE HELP AJOUTÉE (Correctif 404)
app.get('/help', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('help', { user: req.session.user });
});

// Routes Protégées
app.get('/owner/tax-summary', auth.isOwner, exportController.generateTaxSummary);
app.use('/api/ai', aiLimiter);

// Routes Modules
app.use('/', authRoutes);
app.use('/owner', ownerRoutes);
app.use('/tenant', tenantRoutes);
app.use('/admin', adminRoutes);
app.use('/agent', agentRoutes);
app.use('/investor', investorRoutes);
app.use('/artisan', artisanRoutes);
app.use('/chat', chatRoutes);
app.use('/api/signature', signatureRoutes);
app.use('/api/system', systemRoutes); 
app.use('/api', apiRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/cron', cronRoutes); 
app.use('/', publicRoutes);

// Gestion 404
app.use((req, res) => {
    res.status(404).render('errors/404');
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✅ ImmoFacile-CI V3 opérationnel sur le port ${PORT}`);
    });
}

module.exports = app;
