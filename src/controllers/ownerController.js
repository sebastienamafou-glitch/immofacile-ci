// controllers/ownerController.js
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const { generateRandomPassword } = require('../utils/security'); 
const { uploadFromBuffer } = require('../utils/cloudinary');

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
            await tx.user.update({
                where: { id: req.session.user.id },
                data: {
                    escrowBalance: { increment: deposit }
                }
            });
        });

        // 5. Feedback utilisateur avec ajout du téléphone pour WhatsApp
        let redirectUrl = '/owner/dashboard?success=tenant_added';
        if (tempPassword) {
            // Mise à jour : Ajout du paramètre new_phone pour le lien WhatsApp
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
                leases: { 
                    include: { 
                        tenant: true, 
                        payments: { orderBy: { date: 'asc' } } 
                    } 
                },
                incidents: { include: { reporter: true } },
                expenses: true
            }, 
            orderBy: { createdAt: 'desc' }
        });

        let stats = {
            totalRent: 0,
            totalDeposit: 0,
            totalExpenses: 0,
            activeIncidents: 0
        };

        properties.forEach(prop => {
            prop.leases.forEach(lease => {
                if (lease.isActive) {
                    stats.totalRent += lease.monthlyRent;
                    stats.totalDeposit += lease.depositAmount;
                }
            });
            prop.expenses.forEach(exp => {
                stats.totalExpenses += exp.amount;
            });
            prop.incidents.forEach(inc => {
                if (inc.status !== 'RESOLVED') stats.activeIncidents++;
            });
        });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const artisans = await prisma.artisan.findMany({ orderBy: { rating: 'desc' } });

        res.render('dashboard-owner', { 
            user, 
            properties, 
            artisans,
            stats, 
            netIncome: stats.totalRent - stats.totalExpenses,
            activeIncidentsCount: stats.activeIncidents,
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
        let imageUrl = null; 

        if (req.file) {
            try {
                const result = await uploadFromBuffer(req.file.buffer);
                imageUrl = result.secure_url; 
            } catch (uploadError) {
                console.error("Erreur Cloudinary:", uploadError);
                return res.redirect('/owner/dashboard?error=image_upload_failed');
            }
        }

        await prisma.property.create({
            data: {
                title, 
                commune, 
                address,
                price: parseFloat(price),
                imageUrl: imageUrl, 
                ownerId: req.session.user.id
            }
        });

        res.redirect('/owner/dashboard?success=property_created');

    } catch (error) {
        console.error("Erreur création bien:", error);
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

exports.postSubmitInventory = async (req, res) => {
    const { leaseId, type, kitchenState, livingState, bathState, generalComment } = req.body;
    
    try {
        // Logique d'upload multiple pour les photos (Cloudinary)
        const kitchenPhoto = req.files['kitchenPhoto'] ? 
            (await uploadFromBuffer(req.files['kitchenPhoto'][0].buffer)).secure_url : null;
        const livingPhoto = req.files['livingPhoto'] ? 
            (await uploadFromBuffer(req.files['livingPhoto'][0].buffer)).secure_url : null;

        await prisma.inventory.create({
            data: {
                type, // 'ENTREE' ou 'SORTIE'
                kitchenState,
                kitchenPhoto,
                livingState,
                livingPhoto,
                generalComment,
                leaseId
            }
        });

        // Tracking de l'inspection
        await tracker.trackAction("INVENTORY_COMPLETED", "OWNER", req.session.user.id, { leaseId, type });

        res.redirect(`/owner/dashboard?success=inventory_${type.toLowerCase()}_saved`);
    } catch (error) {
        console.error("Erreur enregistrement EDL:", error);
        res.redirect('/owner/dashboard?error=inventory_failed');
    }
};

// --- FIN DE BAIL & SÉQUESTRE (SORTIE) ---

exports.postEndLease = async (req, res) => {
    const { leaseId, deduction } = req.body;
    const deductionAmount = parseFloat(deduction) || 0;

    try {
        let updatedLease = null;
        let isGoodTenant = false;

        await prisma.$transaction(async (tx) => {
            const lease = await tx.lease.findUnique({ 
                where: { id: leaseId },
                include: { tenant: true } 
            });

            if (!lease) throw new Error("Bail introuvable");

            const depositAmount = lease.depositAmount;
            const amountToReturn = depositAmount - deductionAmount;

            updatedLease = await tx.lease.update({
                where: { id: leaseId },
                data: { isActive: false, endDate: new Date() },
                include: { property: true, tenant: true }
            });

            await tx.user.update({
                where: { id: req.session.user.id },
                data: {
                    escrowBalance: { decrement: depositAmount }, 
                    walletBalance: { increment: deductionAmount } 
                }
            });

            if (amountToReturn > 0) {
                await tx.user.update({
                    where: { id: lease.tenantId },
                    data: {
                        walletBalance: { increment: amountToReturn }
                    }
                });
            }

            isGoodTenant = deductionAmount <= (depositAmount * 0.2); 
        });

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


