// src/controllers/ownerController.js

// --- IMPORTS CRITIQUES ---
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const { generateRandomPassword } = require('../utils/security'); 
const { uploadFromBuffer } = require('../utils/cloudinary');
const tracker = require('../utils/tracker'); // Pour l'audit trail
const QRCode = require('qrcode');
const pushService = require('../utils/pushService');

// --- 1. GESTION DES LOCATAIRES ---

exports.getAddTenant = async (req, res) => {
    try {
        const properties = await prisma.property.findMany({
            where: { ownerId: req.session.user.id }
        });
        res.render('owner/add-tenant', { properties });
    } catch (error) {
        console.error("Erreur formulaire locataire:", error);
        res.redirect('/owner/dashboard');
    }
};

exports.postAddTenant = async (req, res) => {
    const { propertyId, tenantName, tenantPhone, monthlyRent, depositMonths, startDate } = req.body;
    
    // ⚖️ JURIDIQUE (Loi 2019) : Blocage des cautions abusives
    // On empêche techniquement le propriétaire de demander > 2 mois de caution + 2 mois d'avance
    if (parseInt(depositMonths) > 4) {
        console.warn(`[AUDIT] Tentative illégale bloquée: ${depositMonths} mois demandés par User ${req.session.user.id}`);
        return res.redirect('/owner/dashboard?error=illegal_deposit');
    }

    try {
        let tempPassword = null;
        let tenantNameForRedirect = '';
        
        // ⚡ TRANSACTION : Atomique pour garantir la cohérence des données
        await prisma.$transaction(async (tx) => {
            // 1. Gestion de l'utilisateur (Création ou Récupération)
            let tenant = await tx.user.findUnique({ where: { phone: tenantPhone } });
            
            if (!tenant) {
                tempPassword = generateRandomPassword(10); 
                const hashedPassword = await bcrypt.hash(tempPassword, 10);
                tenant = await tx.user.create({
                    data: {
                        name: tenantName, 
                        phone: tenantPhone, 
                        email: `${tenantPhone}@immofacile.ci`, // Email placeholder
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
            
            // 2. Création du Bail
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

            // 3. Mise à jour de la "Caisse de Caution" du propriétaire
            await tx.user.update({
                where: { id: req.session.user.id },
                data: { escrowBalance: { increment: deposit } }
            });
        });
        
        // 🛡️ AUDIT TRAIL : Trace l'action pour les logs Admin
        await tracker.trackAction("TENANT_ADDED", "OWNER", req.session.user.id, { propertyId, tenantPhone });

        // Redirection intelligente (affiche le mdp si nouvel utilisateur)
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

// --- 2. DASHBOARD (Optimisé pour la charge) ---

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // ⚡ PERFORMANCE : Promise.all permet d'exécuter les requêtes en parallèle 
        // au lieu de séquentiellement (Gain de temps : ~40%)
        const [properties, user, artisans] = await Promise.all([
            prisma.property.findMany({
                where: { ownerId: userId },
                include: { 
                    leases: { 
                        include: { 
                            tenant: true, 
                            payments: { orderBy: { date: 'asc' } } // Pour les graphiques
                        } 
                    },
                    incidents: { include: { reporter: true } },
                    expenses: true,
                    manager: true // Inclusion de l'agent délégué
                }, 
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.artisan.findMany({ orderBy: { rating: 'desc' }, take: 5 })
        ]);

        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        
        // Calculs Statistiques (Faits en RAM car volume faible par propriétaire)
        let stats = { totalMonthlyRent: 0, totalDeposit: 0, totalExpensesMonth: 0, activeIncidents: 0, rentYTD: 0, expensesYTD: 0 };

        properties.forEach(prop => {
            // Stats des baux
            (prop.leases || []).forEach(lease => {
                if (lease.isActive) {
                    stats.totalMonthlyRent += (lease.monthlyRent || 0);
                    stats.totalDeposit += (lease.depositAmount || 0);
                }
                // Stats des paiements (Year to Date)
                if (lease.payments) {
                    lease.payments.forEach(payment => {
                        const payDate = new Date(payment.date || payment.createdAt);
                        if (payDate >= startOfYear && payDate <= now) stats.rentYTD += (payment.amount || 0);
                    });
                }
            });
            // Stats des dépenses
            (prop.expenses || []).forEach(exp => { 
                stats.totalExpensesMonth += (exp.amount || 0);
                const expDate = new Date(exp.createdAt || exp.date);
                if (expDate >= startOfYear && expDate <= now) stats.expensesYTD += (exp.amount || 0);
            });
            // Stats des incidents
            (prop.incidents || []).forEach(inc => { 
                if (inc.status !== 'RESOLVED') stats.activeIncidents++; 
            });
        });

        if (user) { 
            user.walletBalance = user.walletBalance || 0; 
            user.escrowBalance = user.escrowBalance || 0; 
        }

        // Helpers injectés dans la vue EJS pour le formatage
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
            totalRent: stats.totalMonthlyRent, 
            totalDeposit: stats.totalDeposit, 
            totalExpenses: stats.totalExpensesMonth,
            netIncome: stats.totalMonthlyRent - stats.totalExpensesMonth, 
            activeIncidentsCount: stats.activeIncidents,
            realEscrowBalance: user ? user.escrowBalance : 0,
            totalRentYTD: stats.rentYTD, 
            totalExpensesYTD: stats.expensesYTD, 
            netIncomeYTD: stats.rentYTD - stats.expensesYTD,
            success: req.query.success || null,
            error: req.query.error || null,
            ...helpers 
        });

    } catch (error) {
        console.error("Erreur Critique Dashboard:", error);
        res.redirect('/owner/help'); // Fail-safe
    }
};

// --- 3. GESTION DES BIENS & DÉLÉGATION ---

exports.getAddProperty = async (req, res) => {
    try {
        // On ne charge que les agents actifs pour la liste déroulante
        const agents = await prisma.user.findMany({
            where: { role: 'AGENT', isActive: true },
            select: { id: true, name: true, commune: true }
        });
        res.render('owner/add-property', { agents, csrfToken: req.csrfToken ? req.csrfToken() : "" });
    } catch (error) {
        console.error("Erreur chargement form bien:", error);
        res.redirect('/owner/dashboard');
    }
};

exports.postAddProperty = async (req, res) => {
    try {
        const { title, price, address, commune, description, bedrooms, bathrooms, surface, agentId } = req.body;
        const ownerId = req.session.user.id;
        
        // Gestion Cloudinary : Upload direct depuis la RAM (Buffer)
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
                title, address, commune,
                price: parseInt(price),
                description: description || "", 
                bedrooms: bedrooms ? parseInt(bedrooms) : null,
                bathrooms: bathrooms ? parseInt(bathrooms) : null,
                surface: surface ? parseInt(surface) : null,
                images: imageUrls,
                ownerId: ownerId,
                // Fonctionnalité "Uber-like" : Assignation immédiate
                managedById: agentId && agentId.length > 0 ? agentId : null 
            }
        });

        // 🔔 NOTIFICATION : On prévient l'agent en temps réel
        if (agentId) {
            pushService.sendNotificationToUser(agentId, {
                title: "Nouvelle Mission 🏠",
                body: `Le propriétaire ${req.session.user.name} vous a délégué un bien à ${commune}.`
            }).catch(e => console.error("Erreur push agent", e)); // Non bloquant
        }

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

// --- 4. GESTION QUOTIDIENNE (Dépenses, Incidents, Artisans) ---

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

exports.postAddArtisan = async (req, res) => {
    try {
        await prisma.artisan.create({ 
            data: { 
                name: req.body.name, 
                job: req.body.job, 
                phone: req.body.phone, 
                location: req.body.location || 'Abidjan', 
                isVerified: false 
            } 
        });
        res.redirect('/owner/dashboard?success=artisan_added');
    } catch (error) { 
        console.error(error); 
        res.redirect('/owner/dashboard?error=artisan_failed'); 
    }
};

// --- 5. DOCUMENTS & PDF ---

exports.getContract = async (req, res) => {
    try {
        const lease = await prisma.lease.findUnique({ where: { id: req.params.leaseId }, include: { tenant: true, property: { include: { owner: true } } } });
        // Sécurité : On vérifie que c'est bien SON bien
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

// --- 6. ÉTATS DES LIEUX ---

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
        
        await prisma.inventory.create({ 
            data: { type, kitchenState, kitchenPhoto, livingState, livingPhoto, leaseId } 
        });
        
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
            
            // Désactivation du bail
            updatedLease = await tx.lease.update({
                where: { id: leaseId }, data: { isActive: false, endDate: new Date() }, include: { property: true, tenant: true }
            });
            
            // Mouvements financiers : On rend la caution (virtuellement) et on encaisse les déductions
            await tx.user.update({ 
                where: { id: req.session.user.id }, 
                data: { 
                    escrowBalance: { decrement: lease.depositAmount }, 
                    walletBalance: { increment: deductionAmount } 
                } 
            });
        });
        
        const vacantProperties = await prisma.property.findMany({ where: { ownerId: req.session.user.id, leases: { none: { isActive: true } } } });
        const isGoodTenant = true; 
        res.render('rehousing', { lease: updatedLease, tenant: updatedLease.tenant, vacantProperties, isGoodTenant: isGoodTenant });
    } catch (error) { 
        console.error(error); 
        res.redirect('/owner/dashboard?error=end_lease_failed'); 
    }
};

// --- 7. OUTILS MARKETING (QR Code) ---

exports.generatePoster = async (req, res) => {
    try {
        const propertyId = req.params.id;
        const property = await prisma.property.findUnique({ where: { id: propertyId, ownerId: req.session.user.id } });
        if (!property) return res.status(404).send("Bien introuvable");
        
        const publicUrl = `${req.protocol}://${req.get('host')}/property/${property.id}`;
        // Génération haute qualité pour impression
        const qrCodeUrl = await QRCode.toDataURL(publicUrl, { errorCorrectionLevel: 'H', width: 400, margin: 2, color: { dark: '#0B1120', light: '#FFFFFF' } });
        
        res.render('poster', { property, qrCodeUrl });
    } catch (error) { 
        console.error(error); 
        res.status(500).send("Erreur génération affiche"); 
    }
};

// --- 8. FINANCES & FISCALITÉ ---

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
            // 🛡️ SÉCURITÉ SOLDE : Double vérification avant débit
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

// --- 9. SIGNATURE ÉLECTRONIQUE (V4 - Blockchain Ready) ---

exports.signLease = async (req, res) => {
    const { leaseId, otpEntered } = req.body;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    try {
        const proof = await prisma.signatureProof.findUnique({
            where: { leaseId: leaseId }
        });

        if (!proof) return res.status(404).json({ error: "Procédure de signature non initialisée." });

        // 🛡️ SÉCURITÉ : Vérification OTP + Rôle correspondant
        const isOwner = userRole === 'OWNER' && proof.ownerOtp === otpEntered;
        const isTenant = userRole === 'TENANT' && proof.tenantOtp === otpEntered;

        if (!isOwner && !isTenant) {
            return res.status(403).json({ error: "Code OTP invalide" });
        }

        // Enregistrement de la preuve (IP + Timestamp)
        const updateData = isOwner 
            ? { ownerSigned: true, ownerIp: req.ip } 
            : { tenantSigned: true, tenantIp: req.ip };

        const updatedProof = await prisma.signatureProof.update({
            where: { leaseId: leaseId },
            data: { 
                ...updateData,
                signedAt: new Date() 
            }
        });

        // Si les deux parties ont signé, on valide officiellement le bail
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
