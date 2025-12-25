// controllers/ownerController.js
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const { generateRandomPassword } = require('../utils/security'); 
const { uploadFromBuffer } = require('../utils/cloudinary');
const tracker = require('../utils/tracker'); 
const QRCode = require('qrcode');
const pushService = require('../utils/pushService'); // Import du service Push
const sealing = require('../utils/sealingService');

// --- 1. GESTION LOCATAIRES ---
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
                        name: tenantName, phone: tenantPhone, email: `${tenantPhone}@immofacile.ci`, 
                        password: hashedPassword, role: 'TENANT', walletBalance: 0, escrowBalance: 0
                    }
                });
            }
            tenantNameForRedirect = tenant.name;
            const rent = parseFloat(monthlyRent);
            const deposit = rent * parseFloat(depositMonths);
            await tx.lease.create({
                data: {
                    monthlyRent: rent, depositAmount: deposit, startDate: new Date(startDate),
                    tenantId: tenant.id, propertyId: propertyId, isActive: true
                }
            });
            await tx.user.update({
                where: { id: req.session.user.id },
                data: { escrowBalance: { increment: deposit } }
            });
        });
        
        // Log pour V3
        await tracker.trackAction("TENANT_ADDED", "OWNER", req.session.user.id, { propertyId, tenantPhone });

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

// --- 2. DASHBOARD (AVEC KPIS V3) ---
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const properties = await prisma.property.findMany({
            where: { ownerId: userId },
            include: { 
                leases: { include: { tenant: true, payments: { orderBy: { date: 'asc' } } } },
                incidents: { include: { reporter: true } },
                expenses: true,
                manager: true // V3: On récupère l'agent gestionnaire si assigné
            }, 
            orderBy: { createdAt: 'desc' }
        });

        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        let stats = { totalMonthlyRent: 0, totalDeposit: 0, totalExpensesMonth: 0, activeIncidents: 0, rentYTD: 0, expensesYTD: 0 };

        properties.forEach(prop => {
            (prop.leases || []).forEach(lease => {
                if (lease.isActive) {
                    stats.totalMonthlyRent += (lease.monthlyRent || 0);
                    stats.totalDeposit += (lease.depositAmount || 0);
                }
                if (lease.payments) {
                    lease.payments.forEach(payment => {
                        const payDate = new Date(payment.date || payment.createdAt);
                        if (payDate >= startOfYear && payDate <= now) stats.rentYTD += (payment.amount || 0);
                    });
                }
            });
            (prop.expenses || []).forEach(exp => { 
                stats.totalExpensesMonth += (exp.amount || 0);
                const expDate = new Date(exp.createdAt || exp.date);
                if (expDate >= startOfYear && expDate <= now) stats.expensesYTD += (exp.amount || 0);
            });
            (prop.incidents || []).forEach(inc => { if (inc.status !== 'RESOLVED') stats.activeIncidents++; });
        });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const artisans = await prisma.artisan.findMany({ orderBy: { rating: 'desc' } });
        if (user) { user.walletBalance = user.walletBalance || 0; user.escrowBalance = user.escrowBalance || 0; }

        const helpers = {
            formatMoney: (amount) => (amount || 0).toLocaleString('fr-FR'),
            formatWaLink: (phone, text = '') => {
                if (!phone) return '#';
                let clean = phone.replace(/\D/g, '');
                if (clean.length === 10) clean = '225' + clean;
                return `https://wa.me/${clean}${text ? '?text=' + encodeURIComponent(text) : ''}`;
            }
        };

        res.render('owner/dashboard', { 
            user, properties, artisans, 
            totalRent: stats.totalMonthlyRent, totalDeposit: stats.totalDeposit, totalExpenses: stats.totalExpensesMonth,
            netIncome: stats.totalMonthlyRent - stats.totalExpensesMonth, activeIncidentsCount: stats.activeIncidents,
            realEscrowBalance: user ? user.escrowBalance : 0,
            totalRentYTD: stats.rentYTD, totalExpensesYTD: stats.expensesYTD, netIncomeYTD: stats.rentYTD - stats.expensesYTD,
            ...helpers 
        });
    } catch (error) {
        console.error("Erreur Critique Dashboard:", error);
        res.redirect('/owner/help'); 
    }
};

// --- 3. GESTION BIENS (AVEC DÉLÉGATION AGENT) ---
exports.getAddProperty = async (req, res) => {
    try {
        // V3: Récupérer tous les agents actifs pour le menu déroulant
        const agents = await prisma.user.findMany({
            where: { role: 'AGENT', isActive: true },
            select: { id: true, name: true, commune: true }
        });

        res.render('owner/add-property', { 
            agents, 
            csrfToken: req.csrfToken ? req.csrfToken() : "" 
        });
    } catch (error) {
        console.error("Erreur chargement form bien:", error);
        res.redirect('/owner/dashboard');
    }
};

exports.postAddProperty = async (req, res) => {
    try {
        const { title, price, address, commune, description, bedrooms, bathrooms, surface, agentId } = req.body;
        const ownerId = req.session.user.id;
        
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            if(req.files[0].path) {
                imageUrls = req.files.map(file => file.path);
            } else if (req.files[0].buffer) {
                for (const file of req.files) {
                    const result = await uploadFromBuffer(file.buffer);
                    imageUrls.push(result.secure_url);
                }
            }
        }

        const newProperty = await prisma.property.create({
    data: {
        title, 
        address, 
        commune,
        price: parseInt(price, 10), // Base 10 forcée
        description: description || "",
        // Sécurisation contre les valeurs vides "" qui feraient planter le parseInt
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
        surface: surface ? parseInt(surface, 10) : null,
        images: imageUrls,
        ownerId: ownerId,
        managedById: agentId && agentId.length > 0 ? agentId : null
    }
});

        // V3: Notification Push à l'agent
        if (agentId) {
            pushService.sendNotificationToUser(agentId, {
                title: "Nouvelle Mission 🏠",
                body: `Le propriétaire ${req.session.user.name} vous a délégué un bien à ${commune}.`
            }).catch(e => console.error("Erreur push agent", e));
        }

        // V3: Traçabilité
        await tracker.trackAction("PROPERTY_CREATED", "OWNER", ownerId, { 
            propertyId: newProperty.id,
            delegated: !!agentId 
        });

        res.redirect('/owner/dashboard?success=property_created');
    } catch (error) {
        console.error("Erreur création bien:", error);
        res.redirect('/owner/add-property?error=creation_failed');
    }
};

// --- 4. AUTRES FONCTIONS ---
exports.postAddExpense = async (req, res) => {
    try {
        await prisma.expense.create({
            data: { description: req.body.description, category: req.body.category, amount: parseFloat(req.body.amount), propertyId: req.body.propertyId }
        });
        res.redirect('/owner/dashboard');
    } catch (error) { console.error(error); res.redirect('/owner/dashboard?error=expense_failed'); }
};

exports.postResolveIncident = async (req, res) => {
    try {
        await prisma.incident.update({ where: { id: req.body.incidentId }, data: { status: 'RESOLVED' } });
        res.redirect('/owner/dashboard');
    } catch (error) { console.error(error); res.redirect('/owner/dashboard?error=update_failed'); }
};

exports.postAddArtisan = async (req, res) => {
    try {
        await prisma.artisan.create({ data: { name: req.body.name, job: req.body.job, phone: req.body.phone, location: req.body.location || 'Abidjan', isVerified: false } });
        res.redirect('/owner/dashboard?success=artisan_added');
    } catch (error) { console.error(error); res.redirect('/owner/dashboard?error=artisan_failed'); }
};

// --- 5. DOCUMENTS LÉGAUX ---
exports.getContract = async (req, res) => {
    try {
        const lease = await prisma.lease.findUnique({ where: { id: req.params.leaseId }, include: { tenant: true, property: { include: { owner: true } } } });
        if (!lease || lease.property.ownerId !== req.session.user.id) return res.status(403).send("Refusé");
        res.render('contract', { lease, tenant: lease.tenant, property: lease.property, owner: lease.property.owner, startDate: lease.startDate });
    } catch (e) { res.status(500).send("Erreur"); }
};

exports.getReceipt = async (req, res) => {
    try {
        const payment = await prisma.payment.findUnique({ where: { id: req.params.paymentId }, include: { lease: { include: { tenant: true, property: { include: { owner: true } } } } } });
        if (!payment || payment.lease.property.ownerId !== req.session.user.id) return res.status(403).send("Refusé");
        res.render('receipt', { payment, tenant: payment.lease.tenant, property: payment.lease.property, owner: payment.lease.property.owner });
    } catch (e) { res.status(500).send("Erreur"); }
};

exports.getFormalNotice = async (req, res) => {
    try {
        const lease = await prisma.lease.findUnique({ where: { id: req.params.leaseId }, include: { tenant: true, property: { include: { owner: true } } } });
        if (!lease || lease.property.ownerId !== req.session.user.id) return res.status(403).send("Refusé");
        res.render('formal-notice', { lease, tenant: lease.tenant, property: lease.property, owner: lease.property.owner, totalDue: lease.monthlyRent });
    } catch (e) { res.status(500).send("Erreur"); }
};

exports.getInventory = async (req, res) => {
    try {
        const lease = await prisma.lease.findUnique({ where: { id: req.params.leaseId }, include: { property: true, tenant: true } });
        if (!lease || lease.property.ownerId !== req.session.user.id) return res.status(403).send("Refusé");
        res.render('inventory', { lease, property: lease.property, tenant: lease.tenant, type: req.query.type || 'ENTREE' });
    } catch (e) { res.redirect('/owner/dashboard'); }
};

exports.postSubmitInventory = async (req, res) => {
    const { leaseId, type, kitchenState, livingState } = req.body;
    try {
        const kitchenPhoto = req.files['kitchenPhoto'] ? (await uploadFromBuffer(req.files['kitchenPhoto'][0].buffer)).secure_url : null;
        const livingPhoto = req.files['livingPhoto'] ? (await uploadFromBuffer(req.files['livingPhoto'][0].buffer)).secure_url : null;
        await prisma.inventory.create({ data: { type, kitchenState, kitchenPhoto, livingState, livingPhoto, leaseId } });
        
        // V3: Log
        await tracker.trackAction("INVENTORY_COMPLETED", "OWNER", req.session.user.id, { leaseId, type });
        
        res.redirect(`/owner/dashboard?success=inventory_saved`);
    } catch (error) { console.error(error); res.redirect('/owner/dashboard?error=inventory_failed'); }
};

exports.postEndLease = async (req, res) => {
    const { leaseId, deduction } = req.body;
    const deductionAmount = parseFloat(deduction) || 0;
    try {
        let updatedLease = null;
        await prisma.$transaction(async (tx) => {
            const lease = await tx.lease.findUnique({ where: { id: leaseId }, include: { tenant: true } });
            updatedLease = await tx.lease.update({
                where: { id: leaseId }, data: { isActive: false, endDate: new Date() }, include: { property: true, tenant: true }
            });
            await tx.user.update({ where: { id: req.session.user.id }, data: { escrowBalance: { decrement: lease.depositAmount }, walletBalance: { increment: deductionAmount } } });
        });
        const vacantProperties = await prisma.property.findMany({ where: { ownerId: req.session.user.id, leases: { none: { isActive: true } } } });
        const isGoodTenant = true; 
        res.render('rehousing', { lease: updatedLease, tenant: updatedLease.tenant, vacantProperties, isGoodTenant: isGoodTenant });
    } catch (error) { console.error(error); res.redirect('/owner/dashboard?error=end_lease_failed'); }
};

exports.generatePoster = async (req, res) => {
    try {
        const propertyId = req.params.id;
        const property = await prisma.property.findUnique({ where: { id: propertyId, ownerId: req.session.user.id } });
        if (!property) return res.status(404).send("Bien introuvable");
        const publicUrl = `${req.protocol}://${req.get('host')}/property/${property.id}`;
        const qrCodeUrl = await QRCode.toDataURL(publicUrl, { errorCorrectionLevel: 'H', width: 400, margin: 2, color: { dark: '#0B1120', light: '#FFFFFF' } });
        res.render('poster', { property, qrCodeUrl });
    } catch (error) { console.error(error); res.status(500).send("Erreur génération affiche"); }
};

exports.getTaxSummary = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const selectedYear = parseInt(req.query.year) || (new Date().getFullYear() - 1);
        const startDate = new Date(selectedYear, 0, 1); 
        const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);

        const properties = await prisma.property.findMany({
            where: { ownerId: userId },
            include: {
                leases: {
                    include: {
                        payments: { where: { date: { gte: startDate, lte: endDate } } }
                    }
                },
                expenses: { where: { createdAt: { gte: startDate, lte: endDate } } }
            }
        });

        let globalStats = { totalRevenue: 0, totalExpenses: 0, netIncome: 0 };
        
        const reportData = properties.map(prop => {
            const revenue = prop.leases.reduce((totalLease, lease) => {
                return totalLease + lease.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            }, 0);
            const expense = prop.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            globalStats.totalRevenue += revenue;
            globalStats.totalExpenses += expense;
            return {
                title: prop.title, address: prop.address, commune: prop.commune,
                revenue, expense, net: revenue - expense
            };
        });

        globalStats.netIncome = globalStats.totalRevenue - globalStats.totalExpenses;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        res.render('tax-summary', { reportData, globalStats, year: selectedYear, user, currentDate: new Date().toLocaleDateString('fr-FR') });

    } catch (error) {
        console.error("Erreur Récap Fiscal:", error);
        res.redirect('/owner/dashboard?error=tax_summary_failed');
    }
};

exports.postRequestWithdrawal = async (req, res) => {
    const { amount, paymentDetails } = req.body;
    const userId = req.session.user.id;
    const value = parseInt(amount);

    try {
        await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (user.walletBalance < value) { throw new Error("Solde insuffisant"); }
            await tx.user.update({ where: { id: userId }, data: { walletBalance: { decrement: value } } });
            await tx.withdrawal.create({ data: { amount: value, details: paymentDetails, status: 'PENDING', ownerId: userId } });
        });
        
        await tracker.trackAction("WITHDRAWAL_REQUESTED", "OWNER", userId, { amount: value });
        
        res.redirect('/owner/dashboard?success=withdrawal_initiated');
    } catch (error) {
        console.error("Erreur Retrait:", error);
        res.redirect('/owner/dashboard?error=withdrawal_failed');
    }
};

exports.signLease = async (req, res) => {
    const { leaseId, otpEntered } = req.body;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    try {
        // 1. Récupérer la preuve de scellement en attente
        const proof = await prisma.signatureProof.findUnique({
            where: { leaseId: leaseId }
        });

        // 2. Vérification du code OTP (Signature)
        const isOwner = userRole === 'OWNER' && proof.ownerOtp === otpEntered;
        const isTenant = userRole === 'TENANT' && proof.tenantOtp === otpEntered;

        if (!isOwner && !isTenant) {
            return res.status(403).json({ error: "Code OTP invalide" });
        }

        // 3. Enregistrement de la signature et de l'IP (Traçabilité V4)
        const updateData = isOwner 
            ? { ownerSigned: true, ownerIp: req.ip } 
            : { tenantSigned: true, tenantIp: req.ip };

        const updatedProof = await prisma.signatureProof.update({
            where: { leaseId: leaseId },
            data: { 
                ...updateData,
                signedAt: new Date() // Horodatage
            }
        });

        // 4. Si les deux ont signé, on active officiellement le bail
        if (updatedProof.ownerSigned && updatedProof.tenantSigned) {
            await prisma.lease.update({
                where: { id: leaseId },
                data: { status: 'SIGNED_ELECTRONICALLY' }
            });
        }

        res.json({ success: true, message: "Signature enregistrée avec succès." });

    } catch (error) {
        console.error("Erreur de signature:", error);
        res.status(500).json({ error: "Échec de la procédure de signature" });
    }
};
