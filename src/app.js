const axios = require('axios');
const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const session = require('express-session');
const bcrypt = require('bcryptjs'); 
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

const multer = require('multer');

// --- CONFIGURATION MULTER (STOCKAGE PHOTOS) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- CONFIGURATIONS EXPRESS & MIDDLEWARES ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuration de la session sécurisée
app.use(session({
    secret: 'secret_key_immofacile_abidjan_2024', 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Mettre à true si HTTPS est activé
}));

// Middleware pour rendre l'utilisateur et les variables globales disponibles dans toutes les vues
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// --- ROUTES PUBLIQUES (LANDING & INFOS) ---

// Accueil
app.get('/', (req, res) => {
    res.render('landing');
});

// Politique de Confidentialité
app.get('/privacy', (req, res) => {
    res.render('privacy');
});

// Route CGU & Mentions Légales
app.get('/cgu', (req, res) => {
    res.render('cgu');
});

// Inscription "Lead" / Liste d'attente
app.post('/register', async (req, res) => {
    const { name, phone } = req.body;
    try {
        await prisma.lead.create({ data: { name, phone } });
        res.send(`<div style="background:#0B1120;color:white;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;font-family:sans-serif;">
            <h1 style="color:#F59E0B;font-size:3rem;">Merci !</h1>
            <p>On vous rappelle très vite pour valider votre accès.</p>
            <a href="/signup" style="margin-top:20px;color:white;text-decoration:underline;">Créer mon Compte Propriétaire maintenant</a>
        </div>`);
    } catch (error) {
        res.status(500).send("Erreur ou numéro déjà pris dans la liste d'attente.");
    }
});

// --- SYSTÈME D'AUTHENTIFICATION (SIGNUP / LOGIN / LOGOUT) ---

// Page d'Inscription
app.get('/signup', (req, res) => {
    res.render('signup', { error: null });
});

// Traitement de l'Inscription (Rôle par défaut : OWNER)
app.post('/signup', async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        });
        if (existingUser) {
            return res.render('signup', { error: "Cet email ou ce numéro de téléphone est déjà utilisé." });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { 
                name, 
                email, 
                phone, 
                password: hashedPassword, 
                role: 'OWNER',
                credit: 0 // Initialisation du solde à 0
            }
        });
        req.session.user = { id: user.id, name: user.name, role: user.role };
        res.redirect('/dashboard-owner');
    } catch (error) {
        console.error(error);
        res.render('signup', { error: "Une erreur technique est survenue lors de la création du compte." });
    }
});

// Page de Connexion
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Traitement de la connexion Multi-Rôles
app.post('/login', async (req, res) => {
    const { identifier, password } = req.body;
    try {
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: identifier }, { phone: identifier }] }
        });

        if (!user) return res.render('login', { error: "Utilisateur inconnu." });

        if (!user.isActive) {return res.render('login', {error: "Votre compte a été suspendu par l'administrateur. Contactez le support."});}

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.render('login', { error: "Mot de passe incorrect." });

        req.session.user = { id: user.id, name: user.name, role: user.role };

        // Redirection intelligente selon le rôle
        if (user.role === 'OWNER') res.redirect('/dashboard-owner');
        else if (user.role === 'TENANT') res.redirect('/dashboard-tenant');
        else if (user.role === 'AGENT') res.redirect('/dashboard-agent');
        else if (user.role === 'ADMIN') res.redirect('/dashboard-admin');
        else res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('login', { error: "Erreur de connexion serveur." });
    }
});

// Déconnexion
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// --- DASHBOARD PROPRIÉTAIRE & GESTION DES BIENS ---

// Dashboard Propriétaire (Revenus, Dépenses, Incidents, Solde Credit)
app.get('/dashboard-owner', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'OWNER') return res.redirect('/login');

    // 1. Récupération des données immobilières complexes
    const properties = await prisma.property.findMany({
        where: { ownerId: req.session.user.id },
        include: { 
            leases: { include: { tenant: true, payments: true } },
            incidents: { include: { reporter: true } },
            expenses: true, 
            candidates: true
        }, 
        orderBy: { id: 'desc' }
    });

    let totalRent = 0, totalDeposit = 0, activeIncidentsCount = 0, totalExpenses = 0;

    properties.forEach(prop => {
        prop.leases.forEach(lease => {
            if (lease.isActive) {
                totalRent += lease.monthlyRent;
                totalDeposit += lease.depositAmount;
            }
        });
        prop.incidents.forEach(inc => {
            if (inc.status !== 'RESOLVED') activeIncidentsCount++;
        });
        prop.expenses.forEach(exp => {
            totalExpenses += exp.amount; 
        });
    });

    // 2. Récupération du solde à jour
    const freshUser = await prisma.user.findUnique({ where: { id: req.session.user.id } });

    // 3. Récupération de la liste des artisans pour l'annuaire
    const artisans = await prisma.artisan.findMany();

    res.render('dashboard-owner', { 
        user: freshUser, 
        properties, totalRent, totalDeposit, activeIncidentsCount, totalExpenses,
        netIncome: totalRent - totalExpenses,
        artisans: artisans 
    });
});

// Ajouter un Bien - Formulaire
app.get('/add-property', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('add-property');
});

// Ajouter un Bien - Traitement
app.post('/add-property', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { title, commune, address, price } = req.body;
    try {
        await prisma.property.create({
            data: {
                title, commune, address,
                price: parseFloat(price),
                ownerId: req.session.user.id
            }
        });
        res.redirect('/dashboard-owner');
    } catch (error) {
        console.error(error);
        res.send("Erreur lors de l'enregistrement du bien.");
    }
});

// --- GESTION LOCATAIRES, BAUX & PAIEMENTS ---

// Formulaire Nouveau Locataire
app.get('/add-tenant', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const properties = await prisma.property.findMany({
        where: { ownerId: req.session.user.id }
    });
    res.render('add-tenant', { properties });
});

// Traitement Création Locataire & Bail
app.post('/add-tenant', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { propertyId, tenantName, tenantPhone, monthlyRent, depositMonths, startDate } = req.body;

    try {
        let tenant = await prisma.user.findUnique({ where: { phone: tenantPhone } });
        if (!tenant) {
            const hashedPassword = await bcrypt.hash('123456', 10); // Mot de passe par défaut
            tenant = await prisma.user.create({
                data: {
                    name: tenantName, phone: tenantPhone,
                    email: `${tenantPhone}@immofacile.ci`,
                    password: hashedPassword, role: 'TENANT'
                }
            });
        }
        const calculatedDeposit = parseFloat(monthlyRent) * parseFloat(depositMonths);
        await prisma.lease.create({
            data: {
                monthlyRent: parseFloat(monthlyRent),
                depositAmount: calculatedDeposit, 
                startDate: new Date(startDate),
                tenantId: tenant.id, propertyId: propertyId
            }
        });
        res.redirect('/dashboard-owner');
    } catch (error) {
        console.error(error);
        res.send("Erreur lors de la création du locataire ou du bail.");
    }
});

// Encaisser un loyer avec Système de Commission (Péage Admin)
app.post('/pay-rent', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { leaseId, amount, month } = req.body;
    const rentAmount = parseFloat(amount);
    const COMMISSION_RATE = 0.05; // 5% de commission prélevée sur le solde credit
    const commission = rentAmount * COMMISSION_RATE;

    try {
        const owner = await prisma.user.findUnique({ where: { id: req.session.user.id } });
        
        // Vérification du solde Credit avant encaissement
        if (owner.credit < commission) {
            return res.send(`
                <div style="background:#0B1120; color:white; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                    <h1 style="color:#EF4444; font-size:3rem;">Solde Insuffisant 🛑</h1>
                    <p style="font-size:1.2rem; margin-bottom:20px;">Commission de <strong>${commission} F</strong> requise pour encaisser ce loyer.</p>
                    <p>Votre solde actuel : <strong>${owner.credit} F</strong>.</p>
                    <div style="background:#1E293B; padding:20px; border-radius:15px; margin-top:20px;">
                        <p>Veuillez recharger votre compte via Wave/Orange Money.</p>
                        <h2 style="color:#F59E0B;">Service Client : +225 07 00 00 00</h2>
                    </div>
                    <a href="/dashboard-owner" style="margin-top:30px; color:white; text-decoration:underline;">Retour au Dashboard</a>
                </div>
            `);
        }

        // Transaction atomique : Débit commission + Enregistrement Transaction + Création Paiement 
        await prisma.$transaction([
            prisma.user.update({
                where: { id: owner.id },
                data: { credit: { decrement: commission } }
            }),
            prisma.creditTransaction.create({
                data: {
                    amount: -commission,
                    description: `Commission Loyer ${month} (${rentAmount}F)`,
                    userId: owner.id
                }
            }),
            prisma.payment.create({
                data: { amount: rentAmount, month: month, leaseId: leaseId }
            })
        ]);

        res.redirect('/dashboard-owner');
    } catch (error) {
        console.error(error);
        res.send("Erreur lors du traitement du paiement.");
    }
});

// --- DOCUMENTS & GÉNÉRATION (QUITTANCES / CONTRATS / MISES EN DEMEURE) ---

// Vue Quittance
app.get('/receipt/:paymentId', async (req, res) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: req.params.paymentId },
            include: { 
                lease: { include: { tenant: true, property: { include: { owner: true } } } } 
            }
        });
        if (!payment) return res.send("Quittance introuvable.");
        res.render('receipt', {
            payment, tenant: payment.lease.tenant,
            property: payment.lease.property, owner: payment.lease.property.owner
        });
    } catch (error) {
        console.error(error);
        res.send("Erreur lors de la récupération de la quittance.");
    }
});

// Vue Contrat de Bail avec contrôle de permission Propriétaire/Locataire
app.get('/contract/:leaseId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        const lease = await prisma.lease.findUnique({
            where: { id: req.params.leaseId },
            include: { tenant: true, property: { include: { owner: true } } }
        });
        if (!lease) return res.send("Contrat introuvable.");
        
        const isOwner = lease.property.ownerId === req.session.user.id;
        const isTenant = lease.tenantId === req.session.user.id;

        if (!isOwner && !isTenant) return res.send("Accès refusé : Vous ne faites pas partie de ce contrat.");

        res.render('contract', {
            lease, tenant: lease.tenant,
            property: lease.property, owner: lease.property.owner,
            startDate: lease.startDate
        });
    } catch (error) {
        console.error(error);
        res.send("Erreur lors de la génération du contrat.");
    }
});

// Mise en Demeure (Bouton Rouge)
app.get('/formal-notice/:leaseId', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'OWNER') return res.redirect('/login');
    try {
        const lease = await prisma.lease.findUnique({
            where: { id: req.params.leaseId },
            include: { tenant: true, property: { include: { owner: true } } }
        });
        if (!lease || lease.property.ownerId !== req.session.user.id) return res.send("Accès interdit.");
        res.render('formal-notice', {
            lease, tenant: lease.tenant, property: lease.property,
            owner: lease.property.owner, totalDue: lease.monthlyRent 
        });
    } catch (error) {
        console.error(error);
        res.send("Erreur lors de la génération de la mise en demeure.");
    }
});

// --- ESPACE LOCATAIRE (DASHBOARD, INCIDENTS, ARTISANS) ---

// Dashboard Locataire
app.get('/dashboard-tenant', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'TENANT') return res.redirect('/login');
    const lease = await prisma.lease.findFirst({
        where: { tenantId: req.session.user.id, isActive: true },
        include: { 
            property: { include: { owner: true } }, 
            payments: { orderBy: { date: 'desc' } } 
        }
    });
    let artisans = [];
    if (lease) {
        artisans = await prisma.artisan.findMany({
            where: { ownerId: lease.property.ownerId }
        });
    }
    res.render('dashboard-tenant', {
        user: req.session.user, lease,
        payments: lease ? lease.payments : [], artisans 
    });
});

// Signaler un Incident
app.get('/report-issue', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'TENANT') return res.redirect('/login');
    res.render('report-issue');
});

app.post('/report-issue', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'TENANT') return res.redirect('/login');
    const { title, priority, description } = req.body;
    try {
        const lease = await prisma.lease.findFirst({ where: { tenantId: req.session.user.id, isActive: true } });
        if (!lease) return res.send("Aucun bail actif pour signaler un problème.");
        await prisma.incident.create({
            data: {
                title, priority, description,
                reporterId: req.session.user.id, propertyId: lease.propertyId
            }
        });
        res.redirect('/dashboard-tenant');
    } catch (error) {
        console.error(error);
        res.send("Erreur lors du signalement de l'incident.");
    }
});

// Résoudre un Incident (Action Propriétaire)
app.post('/resolve-incident', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'OWNER') return res.redirect('/login');
    try {
        await prisma.incident.update({
            where: { id: req.body.incidentId },
            data: { status: 'RESOLVED' }
        });
        res.redirect('/dashboard-owner');
    } catch (error) {
        res.send("Erreur mise à jour incident.");
    }
});

// --- CANDIDATURES PUBLIQUES & SCORING ---

// Page Publique du Bien
app.get('/property/:id', async (req, res) => {
    try {
        const property = await prisma.property.findUnique({ where: { id: req.params.id } });
        if (!property) return res.send("Bien non trouvé.");
        res.render('public-property', { property });
    } catch (error) { res.send("Erreur lien public."); }
});

// Traitement Candidature + Algorithme de Scoring Solvabilité
app.post('/apply/:propertyId', async (req, res) => {
    const { name, phone, email, income } = req.body;
    try {
        const property = await prisma.property.findUnique({ where: { id: req.params.propertyId } });
        const rentRatio = (property.price / parseFloat(income)) * 100;
        let score = rentRatio < 30 ? 95 : (rentRatio < 35 ? 80 : (rentRatio < 45 ? 50 : 20));

        await prisma.candidate.create({
            data: { 
                name, phone, email, 
                income: parseFloat(income), score, 
                propertyId: req.params.propertyId 
            }
        });
        res.send(`<div style="font-family:sans-serif; text-align:center; padding:50px;">
            <h1 style="color:#10B981;">Dossier Envoyé !</h1>
            <p>Score de solvabilité estimé : <strong>${score}%</strong>.</p>
            <p>Le propriétaire va analyser votre dossier.</p>
        </div>`);
    } catch (error) { res.send("Erreur candidature."); }
});

// --- GESTION DES DÉPENSES & ARTISANS ---

// Enregistrer une Dépense
app.post('/add-expense', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'OWNER') return res.redirect('/login');
    const { propertyId, description, amount, category } = req.body;
    try {
        await prisma.expense.create({
            data: { description, amount: parseFloat(amount), category, propertyId }
        });
        res.redirect('/dashboard-owner');
    } catch (error) { res.send("Erreur enregistrement dépense."); }
});

// Ajouter un Artisan Partenaire (Propriétaire)
app.post('/add-artisan', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'OWNER') return res.redirect('/login');
    const { name, job, phone } = req.body;
    try {
        await prisma.artisan.create({
            data: { name, job, phone, ownerId: req.session.user.id }
        });
        res.redirect('/dashboard-owner');
    } catch (error) { res.send("Erreur ajout artisan."); }
});

// --- ÉTATS DES LIEUX (AVEC PHOTOS) ---

// Formulaire État des lieux
app.get('/inventory/:leaseId', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const type = req.query.type || 'ENTREE';
    const lease = await prisma.lease.findUnique({
        where: { id: req.params.leaseId },
        include: { property: true, tenant: true }
    });
    res.render('inventory', { lease, property: lease.property, tenant: lease.tenant, type });
});

// Traitement État des lieux + Upload Photos
app.post('/inventory/:leaseId', upload.fields([
    { name: 'livingPhoto', maxCount: 1 },
    { name: 'kitchenPhoto', maxCount: 1 },
    { name: 'bathPhoto', maxCount: 1 }
]), async (req, res) => {
    const { type, livingState, kitchenState, bathState } = req.body;
    const livingPhoto = req.files['livingPhoto'] ? '/' + req.files['livingPhoto'][0].filename : null;
    const kitchenPhoto = req.files['kitchenPhoto'] ? '/' + req.files['kitchenPhoto'][0].filename : null;
    const bathPhoto = req.files['bathPhoto'] ? '/' + req.files['bathPhoto'][0].filename : null;

    try {
        await prisma.inventory.create({
            data: {
                type, livingState, livingPhoto,
                kitchenState, kitchenPhoto,
                bathState, bathPhoto,
                leaseId: req.params.leaseId
            }
        });
        res.send(`<div style="text-align:center; padding:50px;"><h1>✅ État des lieux archivé !</h1><a href="/dashboard-owner">Retour</a></div>`);
    } catch (error) { res.send("Erreur archive état des lieux."); }
});

// --- CLÔTURE DE BAIL & LOGIQUE DE RELOGEMENT ---

// Départ Locataire + Scoring Qualité + Proposition Relogement
app.post('/end-lease', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'OWNER') return res.redirect('/login');
    const { leaseId, deduction } = req.body;
    try {
        const lease = await prisma.lease.update({
            where: { id: leaseId },
            data: { isActive: false, endDate: new Date() },
            include: { property: true, tenant: true }
        });
        
        // Un locataire est considéré "Bon" s'il n'y a aucune retenue sur caution
        const isGoodTenant = parseFloat(deduction) <= 0;
        const vacantProperties = await prisma.property.findMany({
            where: { ownerId: req.session.user.id, leases: { none: { isActive: true } } }
        });

        res.render('rehousing', { lease, tenant: lease.tenant, isGoodTenant, vacantProperties });
    } catch (error) { res.send("Erreur lors de la clôture du bail."); }
});

// --- ESPACE AGENTS DE TERRAIN ---

// Dashboard Agent
app.get('/dashboard-agent', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'AGENT') return res.redirect('/login');
    const leads = await prisma.lead.findMany({
        where: { agentId: req.session.user.id },
        orderBy: { createdAt: 'desc' }
    });
    let commission = 0;
    leads.forEach(l => {
        commission += 5000; // Bonus de prospection
        if (l.status === 'SIGNÉ') commission += 20000; // Bonus de succès
    });
    res.render('dashboard-agent', { user: req.session.user, leads, commission });
});

// Ajouter un Prospect (Lead)
app.post('/add-lead', upload.single('leadPhoto'), async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'AGENT') return res.redirect('/login');
    try {
        await prisma.lead.create({
            data: { 
                name: req.body.name, phone: req.body.phone, address: req.body.address,
                photo: req.file ? '/' + req.file.filename : null,
                agentId: req.session.user.id, status: 'NOUVEAU' 
            }
        });
        res.redirect('/dashboard-agent');
    } catch (error) { res.send("Erreur lead agent."); }
});

// --- SUPER ADMIN DASHBOARD (PILOTAGE CENTRAL) ---

// Dashboard Admin
app.get('/dashboard-admin', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'ADMIN') return res.redirect('/login');
    
    // 1. Récupération des propriétaires et stats
    const owners = await prisma.user.findMany({
        where: { role: 'OWNER' },
        orderBy: { credit: 'asc' }
    });
    const allPayments = await prisma.payment.findMany();
    const volumeAffaires = allPayments.reduce((acc, pay) => acc + pay.amount, 0);
    const agents = await prisma.user.findMany({
        where: { role: 'AGENT' }, include: { leads: true }
    });
    const activeIncidents = await prisma.incident.findMany({
        where: { status: 'OPEN' }, include: { property: true }
    });

    // 2. Récupération de tous les artisans pour l'admin
    const artisans = await prisma.artisan.findMany({ orderBy: { createdAt: 'desc' } });

    res.render('dashboard-admin', {
        user: req.session.user, owners, volumeAffaires,
        myRevenue: volumeAffaires * 0.05, agents, activeIncidents,
        totalUsers: await prisma.user.count(),
        totalProperties: await prisma.property.count(),
        artisans: artisans
    });
});

// Recharger le compte d'un Propriétaire (Action Admin)
app.post('/admin/add-credit', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'ADMIN') return res.redirect('/login');
    const { ownerId, amount } = req.body;
    try {
        const creditAmount = parseFloat(amount);
        await prisma.$transaction([
            prisma.user.update({ where: { id: ownerId }, data: { credit: { increment: creditAmount } } }),
            prisma.creditTransaction.create({
                data: { amount: creditAmount, description: "Rechargement Manuel Admin", userId: ownerId }
            })
        ]);
        res.redirect('/dashboard-admin#tresorerie');
    } catch (error) { res.send("Erreur lors du rechargement manuel."); }
});

// --- MODULE CINETPAY (RECHARGEMENT PRÉPAYÉ) ---

// 1. INITIER LE PAIEMENT (Le Propriétaire clique sur "Payer")
app.post('/api/payment/init', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const transactionId = Math.floor(Math.random() * 100000000).toString(); 
    const amount = parseInt(req.body.amount);

    const SITE_URL = 'https://immofacile-ci.vercel.app'; 
    
    const data = {
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id: transactionId,
        amount: amount,
        currency: 'XOF',
        alternative_currency: 'EUR',
        description: `Rechargement Solde ${req.session.user.name}`,
        customer_id: req.session.user.id,
        customer_name: req.session.user.name,
        customer_surname: "Proprietaire",
        notify_url: `${SITE_URL}/api/payment/notify`,
        return_url: `${SITE_URL}/dashboard-owner`,
        channels: 'ALL',
        metadata: JSON.stringify({ userId: req.session.user.id }) 
    };

    try {
        const response = await axios.post('https://api-checkout.cinetpay.com/v2/payment', data);
        
        if (response.data.code === '201') {
            res.redirect(response.data.data.payment_url);
        } else {
            console.error(response.data);
            res.send(`Erreur CinetPay: ${response.data.description}`);
        }
    } catch (error) {
        console.error(error);
        res.send("Erreur de connexion au service de paiement.");
    }
});

// 2. LE WEBHOOK (CinetPay nous parle en secret pour valider)
app.post('/api/payment/notify', async (req, res) => {
    const { cpm_trans_id } = req.body;

    try {
        const verification = await axios.post('https://api-checkout.cinetpay.com/v2/payment/check', {
            apikey: process.env.CINETPAY_API_KEY,
            site_id: process.env.CINETPAY_SITE_ID,
            transaction_id: cpm_trans_id
        });

        const { code, data } = verification.data;

        if (code === '00') {
            const amountPaid = parseFloat(data.amount);
            const userId = JSON.parse(data.metadata).userId;

            console.log(`💰 PAIEMENT REÇU : ${amountPaid} F pour l'user ${userId}`);

            await prisma.user.update({
                where: { id: userId },
                data: { credit: { increment: amountPaid } }
            });

            await prisma.creditTransaction.create({
                data: {
                    amount: amountPaid,
                    description: `Rechargement CinetPay (Trans: ${cpm_trans_id})`,
                    userId: userId
                }
            });
        }
    } catch (e) {
        console.error("Erreur Webhook:", e.message);
    }

    res.sendStatus(200);
});

// Route pour Bloquer/Débloquer un utilisateur
app.post('/admin/toggle-status', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'ADMIN') return res.redirect('/login');
    
    const { userId, currentStatus } = req.body;
    const newStatus = currentStatus === 'true' ? false : true;

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isActive: newStatus }
        });
        res.redirect('/dashboard-admin');
    } catch (error) {
        res.send("Erreur modification statut");
    }
});

// --- GESTION ARTISANS (ADMIN) ---

// 1. Ajouter un artisan (Admin)
app.post('/admin/add-artisan', async (req, res) => {
    if (req.session.user.role !== 'ADMIN') return res.redirect('/login');

    const { name, job, phone, location } = req.body;

    await prisma.artisan.create({
        data: {
            name, job, phone, location,
            isVerified: true 
        }
    });

    res.redirect('/dashboard-admin');
});

// 2. Supprimer un artisan (Admin)
app.post('/admin/delete-artisan', async (req, res) => {
    if (req.session.user.role !== 'ADMIN') return res.redirect('/login');

    const { artisanId } = req.body;

    await prisma.artisan.delete({
        where: { id: artisanId }
    });

    res.redirect('/dashboard-admin');
});

// --- LANCEMENT DU SERVEUR ---

app.listen(PORT, () => {
    console.log(`🚀 ImmoFacile-CI opérationnel sur http://localhost:${PORT}`);
});
