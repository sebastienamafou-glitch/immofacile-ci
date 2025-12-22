// controllers/ownerController.js
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const { generateRandomPassword } = require('../utils/security'); 
const { uploadFromBuffer } = require('../utils/cloudinary');
const tracker = require('../utils/tracker'); // Ajout manquant pour postSubmitInventory
const QRCode = require('qrcode');
const cloudinary = require('../config/cloudinary');


// --- GESTION LOCATAIRES ---

exports.getAddTenant = async (req, res) => {
    try {
        const properties = await prisma.property.findMany({
            where: { ownerId: req.session.user.id }
        });
        res.render('add-tenant', { properties });
    } catch (error) {
        console.error("Erreur formulaire locataire:", error);
        res.redirect('/owner/dashboard');
    }
};

exports.postAddTenant = async (req, res) => {
    const { propertyId, tenantName, tenantPhone, monthlyRent, depositMonths, startDate } = req.body;
    
    try {
        let tempPassword = null;
        let tenantNameForRedirect = '';

        await prisma.$transaction(async (tx) => {
            let tenant = await tx.user.findUnique({ where: { phone: tenantPhone } });

            if (!tenant) {
                tempPassword = generateRandomPassword(10); 
                const hashedPassword = await bcrypt.hash(tempPassword, 10);
                tenant = await tx.user.create({
                    data: {
                        name: tenantName, 
                        phone: tenantPhone,
                        email: `${tenantPhone}@immofacile.ci`, 
                        password: hashedPassword, 
                        role: 'TENANT',
                        walletBalance: 0,
                        escrowBalance: 0
                    }
                });
            }
            tenantNameForRedirect = tenant.name;
            const rent = parseFloat(monthlyRent);
            const deposit = rent * parseFloat(depositMonths);

            await tx.lease.create({
                data: {
                    monthlyRent: rent,
                    depositAmount: deposit, 
                    startDate: new Date(startDate),
                    tenantId: tenant.id, 
                    propertyId: propertyId,
                    isActive: true
                }
            });

            await tx.user.update({
                where: { id: req.session.user.id },
                data: { escrowBalance: { increment: deposit } }
            });
        });

        let redirectUrl = '/owner/dashboard?success=tenant_added';
        if (tempPassword) {
            redirectUrl += `&new_pass=${tempPassword}&new_user=${encodeURIComponent(tenantNameForRedirect)}&new_phone=${tenantPhone}`; 
        }
        res.redirect(redirectUrl);

    } catch (error) {
        console.error("Erreur ajout locataire:", error);
        res.redirect('/owner/dashboard?error=tenant_creation_failed');
    }
};

// --- DASHBOARD ---

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const properties = await prisma.property.findMany({
            where: { ownerId: userId },
            include: { 
                leases: { include: { tenant: true, payments: { orderBy: { date: 'asc' } } } },
                incidents: { include: { reporter: true } },
                expenses: true
            }, 
            orderBy: { createdAt: 'desc' }
        });

        // --- NOUVEAU CALCUL YTD (Year to Date) ---
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1); // 1er Janvier

        let stats = { 
            totalMonthlyRent: 0, // Somme des loyers théoriques mensuels
            totalDeposit: 0, 
            totalExpensesMonth: 0, // Dépenses globales (ou du mois selon votre logique précédente)
            activeIncidents: 0,
            
            // Les nouveaux compteurs réels
            rentYTD: 0,      // Total encaissé en 2024
            expensesYTD: 0   // Total décaissé en 2024
        };

        properties.forEach(prop => {
            // 1. Gestion des Baux et Paiements
            (prop.leases || []).forEach(lease => {
                if (lease.isActive) {
                    stats.totalMonthlyRent += (lease.monthlyRent || 0);
                    stats.totalDeposit += (lease.depositAmount || 0);
                }

                // Calcul des encaissements réels cette année (YTD)
                if (lease.payments) {
                    lease.payments.forEach(payment => {
                        const payDate = new Date(payment.date || payment.createdAt);
                        if (payDate >= startOfYear && payDate <= now) {
                            stats.rentYTD += (payment.amount || 0);
                        }
                    });
                }
            });

            // 2. Gestion des Dépenses
            (prop.expenses || []).forEach(exp => { 
                stats.totalExpensesMonth += (exp.amount || 0); // Votre ancien total global

                // Calcul des dépenses réelles cette année (YTD)
                const expDate = new Date(exp.createdAt || exp.date); // Prisma utilise souvent createdAt
                if (expDate >= startOfYear && expDate <= now) {
                    stats.expensesYTD += (exp.amount || 0);
                }
            });

            // 3. Incidents
            (prop.incidents || []).forEach(inc => { 
                if (inc.status !== 'RESOLVED') stats.activeIncidents++; 
            });
        });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const artisans = await prisma.artisan.findMany({ orderBy: { rating: 'desc' } });

        if (user) {
            user.walletBalance = user.walletBalance || 0;
            user.escrowBalance = user.escrowBalance || 0;
        }

        res.render('dashboard-owner', { 
            user, 
            properties, 
            artisans, 
            
            // Variables Mensuelles / Globales existantes
            totalRent: stats.totalMonthlyRent,
            totalDeposit: stats.totalDeposit,
            totalExpenses: stats.totalExpensesMonth,
            netIncome: stats.totalMonthlyRent - stats.totalExpensesMonth,
            activeIncidentsCount: stats.activeIncidents,
            realEscrowBalance: user ? user.escrowBalance : 0,

            // --- NOUVELLES VARIABLES ANNUELLES ---
            totalRentYTD: stats.rentYTD,
            totalExpensesYTD: stats.expensesYTD,
            netIncomeYTD: stats.rentYTD - stats.expensesYTD // Bénéfice net annuel
        });

    } catch (error) {
        console.error("Erreur Critique Dashboard:", error);
        res.redirect('/owner/help'); 
    }
};

// --- GESTION BIENS ---

exports.postAddProperty = async (req, res) => {
    const { title, commune, address, price } = req.body;
    try {
        let imageUrl = null; 
        if (req.file) {
            try {
                const result = await uploadFromBuffer(req.file.buffer);
                imageUrl = result.secure_url; 
            } catch (err) { console.error(err); }
        }

        await prisma.property.create({
            data: {
                title, commune, address,
                price: parseFloat(price),
                imageUrl: imageUrl, 
                ownerId: req.session.user.id
            }
        });
        res.redirect('/owner/dashboard?success=property_created');
    } catch (error) {
        console.error(error);
        res.redirect('/owner/dashboard?error=creation_failed');
    }
};

// --- DEPENSES & INCIDENTS ---

exports.postAddExpense = async (req, res) => {
    try {
        await prisma.expense.create({
            data: {
                description: req.body.description,
                category: req.body.category,
                amount: parseFloat(req.body.amount),
                propertyId: req.body.propertyId
            }
        });
        res.redirect('/owner/dashboard');
    } catch (error) {
        console.error(error);
        res.redirect('/owner/dashboard?error=expense_failed');
    }
};

exports.postResolveIncident = async (req, res) => {
    try {
        await prisma.incident.update({
            where: { id: req.body.incidentId },
            data: { status: 'RESOLVED' }
        });
        res.redirect('/owner/dashboard');
    } catch (error) {
        console.error(error);
        res.redirect('/owner/dashboard?error=update_failed');
    }
};

// --- ARTISANS ---

exports.postAddArtisan = async (req, res) => {
    try {
        await prisma.artisan.create({
            data: { 
                name: req.body.name, job: req.body.job, 
                phone: req.body.phone, location: req.body.location || 'Abidjan', 
                isVerified: false 
            }
        });
        res.redirect('/owner/dashboard?success=artisan_added');
    } catch (error) {
        console.error(error);
        res.redirect('/owner/dashboard?error=artisan_failed');
    }
};

// --- DOCUMENTS ---

exports.getContract = async (req, res) => {
    try {
        const lease = await prisma.lease.findUnique({
            where: { id: req.params.leaseId },
            include: { tenant: true, property: { include: { owner: true } } }
        });
        if (!lease || lease.property.ownerId !== req.session.user.id) return res.status(403).send("Refusé");
        res.render('contract', { lease, tenant: lease.tenant, property: lease.property, owner: lease.property.owner, startDate: lease.startDate });
    } catch (e) { res.status(500).send("Erreur"); }
};

exports.getReceipt = async (req, res) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: req.params.paymentId },
            include: { lease: { include: { tenant: true, property: { include: { owner: true } } } } }
        });
        if (!payment || payment.lease.property.ownerId !== req.session.user.id) return res.status(403).send("Refusé");
        res.render('receipt', { payment, tenant: payment.lease.tenant, property: payment.lease.property, owner: payment.lease.property.owner });
    } catch (e) { res.status(500).send("Erreur"); }
};

exports.getFormalNotice = async (req, res) => {
    try {
        const lease = await prisma.lease.findUnique({
            where: { id: req.params.leaseId },
            include: { tenant: true, property: { include: { owner: true } } }
        });
        if (!lease || lease.property.ownerId !== req.session.user.id) return res.status(403).send("Refusé");
        res.render('formal-notice', { lease, tenant: lease.tenant, property: lease.property, owner: lease.property.owner, totalDue: lease.monthlyRent });
    } catch (e) { res.status(500).send("Erreur"); }
};

exports.getInventory = async (req, res) => {
    try {
        const lease = await prisma.lease.findUnique({
            where: { id: req.params.leaseId },
            include: { property: true, tenant: true }
        });
        if (!lease || lease.property.ownerId !== req.session.user.id) return res.status(403).send("Refusé");
        res.render('inventory', { lease, property: lease.property, tenant: lease.tenant, type: req.query.type || 'ENTREE' });
    } catch (e) { res.redirect('/owner/dashboard'); }
};

exports.postSubmitInventory = async (req, res) => {
    const { leaseId, type, kitchenState, livingState } = req.body;
    try {
        const kitchenPhoto = req.files['kitchenPhoto'] ? (await uploadFromBuffer(req.files['kitchenPhoto'][0].buffer)).secure_url : null;
        const livingPhoto = req.files['livingPhoto'] ? (await uploadFromBuffer(req.files['livingPhoto'][0].buffer)).secure_url : null;

        await prisma.inventory.create({
            data: { type, kitchenState, kitchenPhoto, livingState, livingPhoto, leaseId }
        });

        // TRACKING
        await tracker.trackAction("INVENTORY_COMPLETED", "OWNER", req.session.user.id, { leaseId, type });

        res.redirect(`/owner/dashboard?success=inventory_saved`);
    } catch (error) {
        console.error(error);
        res.redirect('/owner/dashboard?error=inventory_failed');
    }
};

exports.postEndLease = async (req, res) => {
    const { leaseId, deduction } = req.body;
    const deductionAmount = parseFloat(deduction) || 0;
    try {
        let updatedLease = null;
        await prisma.$transaction(async (tx) => {
            const lease = await tx.lease.findUnique({ where: { id: leaseId }, include: { tenant: true } });
            updatedLease = await tx.lease.update({
                where: { id: leaseId },
                data: { isActive: false, endDate: new Date() },
                include: { property: true, tenant: true }
            });
            await tx.user.update({ where: { id: req.session.user.id }, data: { escrowBalance: { decrement: lease.depositAmount }, walletBalance: { increment: deductionAmount } } });
        });

        const vacantProperties = await prisma.property.findMany({ where: { ownerId: req.session.user.id, leases: { none: { isActive: true } } } });
        
        // --- CORRECTION AJOUTÉE ICI ---
        const isGoodTenant = true; // Définit le statut pour éviter le crash ReferenceError
        
        res.render('rehousing', { 
            lease: updatedLease, 
            tenant: updatedLease.tenant, 
            vacantProperties,
            isGoodTenant: isGoodTenant // Variable passée à la vue
        });

    } catch (error) {
        console.error(error);
        res.redirect('/owner/dashboard?error=end_lease_failed');
    }
};

exports.generatePoster = async (req, res) => {
    try {
        const propertyId = req.params.id;
        
        // Récupérer le bien
        const property = await prisma.property.findUnique({
            where: { id: propertyId, ownerId: req.session.user.id } // Sécurité
        });

        if (!property) return res.status(404).send("Bien introuvable");

        // L'URL publique du bien (à adapter avec votre vrai domaine en prod)
        const publicUrl = `${req.protocol}://${req.get('host')}/property/${property.id}`;

        // Générer le QR Code en Data URL (Base64)
        const qrCodeUrl = await QRCode.toDataURL(publicUrl, {
            errorCorrectionLevel: 'H', // Haute résistance (si l'affiche est un peu abîmée)
            width: 400,
            margin: 2,
            color: {
                dark: '#0B1120', // Vos couleurs
                light: '#FFFFFF'
            }
        });

        res.render('poster', { property, qrCodeUrl });

    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur génération affiche");
    }
};

exports.postAddProperty = async (req, res) => {
    try {
        const { title, price, address, commune, description, bedrooms, bathrooms, surface } = req.body;
        const ownerId = req.session.user.id;
        
        // GESTION DES IMAGES MULTIPLES
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            // On suppose que vous avez un middleware multer qui a déjà uploadé sur Cloudinary
            // ou qui met les fichiers dans req.files
            imageUrls = req.files.map(file => file.path); 
        }

        // CRÉATION EN BASE DE DONNÉES
        await prisma.property.create({
            data: {
                title,
                address,
                commune,
                price: parseInt(price), // Conversion en entier
                
                // Nouveaux champs
                description: description || "",
                bedrooms: bedrooms ? parseInt(bedrooms) : null,
                bathrooms: bathrooms ? parseInt(bathrooms) : null,
                surface: surface ? parseInt(surface) : null,
                images: imageUrls, // Tableau d'URL
                
                ownerId: ownerId
            }
        });

        res.redirect('/owner/dashboard?success=property_created');

    } catch (error) {
        console.error(error);
        res.redirect('/owner/add-property?error=creation_failed');
    }
};
