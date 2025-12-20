// controllers/ownerController.js
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const { generateRandomPassword } = require('../utils/security'); 

// --- GESTION LOCATAIRES (AVEC SÉQUESTRE À L'ENTRÉE) ---

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
    // Récupération des données du formulaire
    const { propertyId, tenantName, tenantPhone, monthlyRent, depositMonths, startDate } = req.body;
    
    try {
        let tempPassword = null;
        let tenantNameForRedirect = '';

        // Utilisation d'une transaction pour garantir la cohérence des données et des fonds
        await prisma.$transaction(async (tx) => {
            // 1. Vérifier ou créer le locataire
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
                console.log(`🔐 CRITIQUE : Mot de passe généré pour ${tenantName} : ${tempPassword}`);
            }
            
            tenantNameForRedirect = tenant.name;

            // 2. Calculs financiers
            const rent = parseFloat(monthlyRent);
            const deposit = rent * parseFloat(depositMonths);

            // 3. Création du Bail
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

            // 4. LOGIQUE SÉQUESTRE (ENTRÉE)
            // On enregistre que le propriétaire détient cette caution (dette envers le locataire)
            // On augmente le solde "bloqué" (escrow) du propriétaire
            await tx.user.update({
                where: { id: req.session.user.id },
                data: {
                    escrowBalance: { increment: deposit }
                }
            });
            
            // Note: Dans un système réel, on débitera aussi le locataire ici s'il a du solde.
        });

        // 5. Feedback utilisateur
        let redirectUrl = '/owner/dashboard?success=tenant_added';
        if (tempPassword) {
            redirectUrl += `&new_pass=${tempPassword}&new_user=${encodeURIComponent(tenantNameForRedirect)}`; 
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

        // 1. Récupération optimisée des données
        const properties = await prisma.property.findMany({
    where: { ownerId: userId },
    include: { 
        leases: { 
            include: { 
                tenant: true, 
                // CORRECTION ICI : On trie les paiements par date croissante
                payments: { orderBy: { date: 'asc' } } 
            } 
        },
        incidents: { include: { reporter: true } },
        expenses: true
    }, 
    orderBy: { createdAt: 'desc' }
});

        // 2. Calculs Financiers
        let stats = {
            totalRent: 0,
            totalDeposit: 0, // Sera calculé via les baux actifs
            totalExpenses: 0,
            activeIncidents: 0
        };

        properties.forEach(prop => {
            // Revenus & Caution
            prop.leases.forEach(lease => {
                if (lease.isActive) {
                    stats.totalRent += lease.monthlyRent;
                    stats.totalDeposit += lease.depositAmount;
                }
            });
            // Dépenses
            prop.expenses.forEach(exp => {
                stats.totalExpenses += exp.amount;
            });
            // Incidents non résolus
            prop.incidents.forEach(inc => {
                if (inc.status !== 'RESOLVED') stats.activeIncidents++;
            });
        });

        // 3. Récupération données utilisateur & Artisans
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const artisans = await prisma.artisan.findMany({ orderBy: { rating: 'desc' } });

        res.render('dashboard-owner', { 
            user, 
            properties, 
            artisans,
            stats, 
            netIncome: stats.totalRent - stats.totalExpenses,
            activeIncidentsCount: stats.activeIncidents,
            // On peut afficher le vrai solde séquestre de la BDD pour vérification
            realEscrowBalance: user.escrowBalance || 0 
        });

    } catch (error) {
        console.error("Erreur Dashboard:", error);
        res.status(500).send("Erreur lors du chargement du tableau de bord");
    }
};

// --- GESTION BIENS ---

exports.postAddProperty = async (req, res) => {
    const { title, commune, address, price } = req.body;
    try {
        await prisma.property.create({
            data: {
                title, commune, address,
                price: parseFloat(price),
                ownerId: req.session.user.id
            }
        });
        res.redirect('/owner/dashboard');
    } catch (error) {
        console.error(error);
        res.redirect('/owner/dashboard?error=creation_failed');
    }
};

// --- GESTION DEPENSES & INCIDENTS ---

exports.postAddExpense = async (req, res) => {
    const { propertyId, description, amount, category } = req.body;
    try {
        await prisma.expense.create({
            data: {
                description,
                category,
                amount: parseFloat(amount),
                propertyId
            }
        });
        res.redirect('/owner/dashboard');
    } catch (error) {
        console.error(error);
        res.redirect('/owner/dashboard?error=expense_failed');
    }
};

exports.postResolveIncident = async (req, res) => {
    const { incidentId } = req.body;
    try {
        await prisma.incident.update({
            where: { id: incidentId },
            data: { status: 'RESOLVED' }
        });
        res.redirect('/owner/dashboard');
    } catch (error) {
        console.error(error);
        res.redirect('/owner/dashboard?error=update_failed');
    }
};

// --- GESTION ARTISANS ---

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

// --- DOCUMENTS PDF ---

exports.getContract = async (req, res) => {
    try {
        const lease = await prisma.lease.findUnique({
            where: { id: req.params.leaseId },
            include: { tenant: true, property: { include: { owner: true } } }
        });

        if (!lease || lease.property.ownerId !== req.session.user.id) {
            return res.status(403).send("Accès refusé.");
        }

        res.render('contract', {
            lease, 
            tenant: lease.tenant,
            property: lease.property, 
            owner: lease.property.owner,
            startDate: lease.startDate
        });
    } catch (error) {
        console.error("Erreur contrat:", error);
        res.status(500).send("Erreur génération contrat.");
    }
};

exports.getReceipt = async (req, res) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: req.params.paymentId },
            include: { 
                lease: { include: { tenant: true, property: { include: { owner: true } } } } 
            }
        });

        if (!payment || payment.lease.property.ownerId !== req.session.user.id) {
            return res.status(403).send("Accès refusé.");
        }

        res.render('receipt', {
            payment, 
            tenant: payment.lease.tenant,
            property: payment.lease.property, 
            owner: payment.lease.property.owner
        });
    } catch (error) {
        console.error("Erreur quittance:", error);
        res.status(500).send("Erreur génération quittance.");
    }
};

exports.getFormalNotice = async (req, res) => {
    try {
        const lease = await prisma.lease.findUnique({
            where: { id: req.params.leaseId },
            include: { tenant: true, property: { include: { owner: true } } }
        });

        if (!lease || lease.property.ownerId !== req.session.user.id) {
            return res.status(403).send("Accès refusé.");
        }

        res.render('formal-notice', {
            lease, 
            tenant: lease.tenant, 
            property: lease.property,
            owner: lease.property.owner, 
            totalDue: lease.monthlyRent 
        });
    } catch (error) {
        console.error("Erreur mise en demeure:", error);
        res.status(500).send("Erreur génération document.");
    }
};

exports.getInventory = async (req, res) => {
    try {
        const type = req.query.type || 'ENTREE';
        const lease = await prisma.lease.findUnique({
            where: { id: req.params.leaseId },
            include: { property: true, tenant: true }
        });

        if (!lease || lease.property.ownerId !== req.session.user.id) {
            return res.status(403).send("Accès refusé.");
        }

        res.render('inventory', { 
            lease, 
            property: lease.property, 
            tenant: lease.tenant, 
            type 
        });
    } catch (error) {
        console.error("Erreur état des lieux:", error);
        res.redirect('/owner/dashboard');
    }
};

// --- FIN DE BAIL & SÉQUESTRE (SORTIE) ---

exports.postEndLease = async (req, res) => {
    const { leaseId, deduction } = req.body;
    const deductionAmount = parseFloat(deduction) || 0;

    try {
        // Variables pour la vue de relogement
        let updatedLease = null;
        let isGoodTenant = false;

        // Transaction : Clôture bail + Mouvement d'argent (Remboursement caution)
        await prisma.$transaction(async (tx) => {
            // 1. Récupérer le bail (pour connaître la caution initiale)
            const lease = await tx.lease.findUnique({ 
                where: { id: leaseId },
                include: { tenant: true } 
            });

            if (!lease) throw new Error("Bail introuvable");

            // 2. Calculs
            const depositAmount = lease.depositAmount;
            const amountToReturn = depositAmount - deductionAmount;

            // 3. Clôturer le bail
            updatedLease = await tx.lease.update({
                where: { id: leaseId },
                data: { isActive: false, endDate: new Date() },
                include: { property: true, tenant: true }
            });

            // 4. LOGIQUE SÉQUESTRE (SORTIE)
            // A. On vide le compte séquestre du proprio pour ce montant
            // B. On ajoute la retenue (deduction) au portefeuille disponible du proprio
            await tx.user.update({
                where: { id: req.session.user.id },
                data: {
                    escrowBalance: { decrement: depositAmount }, // On libère la totalité de la dette
                    walletBalance: { increment: deductionAmount } // On encaisse les réparations/impayés
                }
            });

            // C. On rend le reste au locataire (Wallet)
            if (amountToReturn > 0) {
                await tx.user.update({
                    where: { id: lease.tenantId },
                    data: {
                        walletBalance: { increment: amountToReturn }
                    }
                });
            }

            // Définition bon locataire (si peu de retenues)
            isGoodTenant = deductionAmount <= (depositAmount * 0.2); // Exemple: retenue < 20%
        });

        // 5. Trouver d'autres biens vacants pour le relogement
        const vacantProperties = await prisma.property.findMany({
            where: { 
                ownerId: req.session.user.id, 
                leases: { none: { isActive: true } } 
            }
        });

        res.render('rehousing', { 
            lease: updatedLease, 
            tenant: updatedLease.tenant, 
            isGoodTenant, 
            vacantProperties,
            refundAmount: updatedLease.depositAmount - deductionAmount
        });

    } catch (error) {
        console.error("Erreur clôture bail:", error);
        res.redirect('/owner/dashboard?error=end_lease_failed');
    }
};
