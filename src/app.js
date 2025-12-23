const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const csrfMiddleware = require('./middleware/csrfMiddleware');
const helmet = require('helmet'); 
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);

require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const adminRoutes = require('./routes/adminRoutes');
const agentRoutes = require('./routes/agentRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1); 

app.use(helmet({
  contentSecurityPolicy: false, 
}));

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

app.use(csrfMiddleware);

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.csrfToken = (typeof req.csrfToken === 'function') ? req.csrfToken() : null;
    next();
});

// --- ROUTES ---

// Route publique pour les CGU/Mentions Légales (PLACÉE ICI POUR FONCTIONNER)
app.get('/terms', (req, res) => {
    res.render('terms'); 
});

app.use('/', authRoutes);
app.use('/owner', ownerRoutes);
app.use('/tenant', tenantRoutes);
app.use('/admin', adminRoutes);
app.use('/agent', agentRoutes);
app.use('/api', apiRoutes);

// --- GESTION DES ERREURS (TOUJOURS À LA FIN) ---
app.use((req, res) => {
    res.status(404).render('errors/404');
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✅ ImmoFacile-CI (Prod Ready) opérationnel sur le port ${PORT}`);
    });
}

module.exports = app;
