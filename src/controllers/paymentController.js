// src/controllers/paymentController.js
const prisma = require('../prisma/client');
const axios = require('axios');
const tracker = require('../utils/tracker');
// 🟢 IMPORT CRITIQUE : Service pour la vérification officielle
const cinetpayService = require('../services/cinetpay'); 

// --- HELPER LOCAL (Pour initialisation API flexible) ---
const callCinetPayInit = async (payload) => {
    try {
        const response = await axios.post('https://api-checkout.cinetpay.com/v2/payment', payload);
        return response.data;
    } catch (error) {
        console.error("Erreur API CinetPay:", error.response?.data || error.message);
        throw new Error("Erreur de communication avec CinetPay");
    }
};

// --- 1. ENCAISSEMENT MANUEL (Loyer Cash/Virement) ---
// Utilisé par le propriétaire pour déclarer un paiement reçu hors plateforme
exports.postPayRent = async (req, res) => {
    const { leaseId, amount, month } = req.body;
    const rentAmount = parseInt(amount);
    const userId = req.session.user.id;
    const COMMISSION_RATE = 0.05; // 5%

    try {
        const owner = await prisma.user.findUnique({ where: { id: userId } });
        const commission = Math.round(rentAmount * COMMISSION_RATE);

        // Vérification Solde Wallet
        if (owner.walletBalance < commission) {
            return res.status(402).render('errors/insufficient-funds', { 
                commission, 
                currentCredit: owner.walletBalance 
            });
        }

        // Transaction Atomique : Débit Commission + Enregistrement Paiement
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { walletBalance: { decrement: commission } } 
            }),
            prisma.creditTransaction.create({
                data: {
                    amount: -commission,
                    description: `Commission Loyer ${month} (Manuel)`,
                    userId: userId,
                    status: 'COMPLETED',
                    transactionId: `MANUAL_${Date.now()}`
                }
            }),
            prisma.payment.create({
                data: { 
                    amount: rentAmount, 
                    month: month, 
                    leaseId: leaseId,
                    type: "LOYER",
                    status: 'COMPLETED',
                    paidAt: new Date()
                }
            })
        ]);

        await tracker.trackAction("RENT_COLLECTED", "OWNER", userId, { amount: rentAmount, leaseId });

        res.redirect('/owner/dashboard?success=payment_recorded');

    } catch (error) {
        console.error("❌ Erreur Encaissement:", error);
        res.redirect('/owner/dashboard?error=payment_failed');
    }
};

// --- 2. RECHARGEMENT COMPTE (Propriétaire) ---
// Initialise le paiement pour créditer le Wallet
exports.initCinetPay = async (req, res) => {
    const amount = parseInt(req.body.amount);
    // Génération ID unique pour CinetPay
    const transactionId = `TRANS_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const SITE_URL = process.env.APP_URL || 'http://localhost:3000'; 

    try {
        // NOTE: On ne crée pas de transaction PENDING en BDD ici.
        // On fait confiance aux métadonnées que CinetPay nous renverra.
        
        const data = {
            apikey: process.env.CINETPAY_API_KEY,
            site_id: process.env.CINETPAY_SITE_ID,
            transaction_id: transactionId,
            amount: amount,
            currency: 'XOF',
            description: `Rechargement Wallet ImmoFacile`,
            customer_id: req.session.user.id,
            customer_name: req.session.user.name,
            // URLs de retour
            notify_url: `${SITE_URL}/api/payment/notify`,
            return_url: `${SITE_URL}/owner/dashboard?success=recharge_pending`,
            channels: 'ALL',
            // METADATA : C'est ici qu'on stocke l'info cruciale pour le Webhook
            metadata: JSON.stringify({ 
                type: 'WALLET_RECHARGE', 
                userId: req.session.user.id 
            })
        };

        const result = await callCinetPayInit(data);
        
        if (result.code === '201') {
            res.redirect(result.data.payment_url);
        } else {
            throw new Error(result.description);
        }
    } catch (error) {
        console.error("CinetPay Init Error:", error);
        res.redirect('/owner/dashboard?error=payment_init_failed');
    }
};

// --- 3. PAIEMENT FRAIS DE DOSSIER (Locataire) ---
exports.payApplicationFees = async (req, res) => {
    const { leaseId } = req.body;
    const FEES_AMOUNT = 20000; // Montant Fixe
    const user = req.session.user;
    const SITE_URL = process.env.APP_URL || 'http://localhost:3000';
    const transactionId = `FEES_${leaseId}_${Date.now()}`;

    try {
        const data = {
            apikey: process.env.CINETPAY_API_KEY,
            site_id: process.env.CINETPAY_SITE_ID,
            transaction_id: transactionId,
            amount: FEES_AMOUNT,
            currency: 'XOF',
            description: `Frais de dossier Bail #${leaseId.split('-')[0]}`,
            customer_name: user.name,
            customer_email: user.email,
            customer_phone_number: user.phone,
            notify_url: `${SITE_URL}/api/payment/notify`,
            return_url: `${SITE_URL}/tenant/dashboard?success=fees_paid`,
            channels: 'ALL',
            metadata: JSON.stringify({ 
                type: 'FRAIS_DOSSIER', 
                leaseId: leaseId,
                userId: user.id 
            })
        };

        const result = await callCinetPayInit(data);

        if (result.code === '201') {
            res.redirect(result.data.payment_url);
        } else {
            res.redirect('/tenant/dashboard?error=payment_init_failed');
        }
    } catch (error) {
        console.error("Erreur Frais Dossier:", error);
        res.redirect('/tenant/dashboard?error=server_error');
    }
};

// --- 4. WEBHOOK (Cerveau Financier) 🧠 ---
exports.webhookCinetPay = async (req, res) => {
    const { cpm_trans_id } = req.body;
    
    // Sécurité de base
    if (!cpm_trans_id) return res.sendStatus(400);

    try {
        // 1. VÉRIFICATION OFFICIELLE
        // On interroge CinetPay pour obtenir les données fiables (montant, statut, métadonnées)
        const response = await cinetpayService.verifyPayment(cpm_trans_id);
        
        if (response.code !== '00') {
            console.warn(`[Webhook] Echec/Attente: ${cpm_trans_id} - ${response.message}`);
            return res.sendStatus(200); // On acquitte pour éviter le spam
        }

        const data = response.data;
        // Extraction sécurisée des métadonnées injectées lors de l'init
        const metadata = data.metadata ? JSON.parse(data.metadata) : {};
        const amount = parseInt(data.amount);

        // --- IDEMPOTENCE ---
        // Vérifier si cette transaction ID a déjà été traitée en BDD
        const existingTx = await prisma.creditTransaction.findFirst({
            where: { transactionId: cpm_trans_id }
        });
        
        // Si elle existe déjà, on vérifie si c'est pour des Frais de Dossier (table Payment)
        const existingPayment = await prisma.payment.findFirst({
            where: { transactionId: cpm_trans_id }
        });

        if (existingTx || existingPayment) {
            console.log(`♻️ Transaction déjà traitée : ${cpm_trans_id}`);
            return res.sendStatus(200);
        }

        // --- SCÉNARIO A : RECHARGEMENT WALLET ---
        if (metadata.type === 'WALLET_RECHARGE') {
            const userId = metadata.userId;
            
            await prisma.$transaction([
                // Crédit du Wallet
                prisma.user.update({
                    where: { id: userId },
                    data: { walletBalance: { increment: amount } }
                }),
                // Historisation
                prisma.creditTransaction.create({
                    data: {
                        amount: amount,
                        description: `Rechargement Mobile Money`,
                        userId: userId,
                        status: 'COMPLETED',
                        transactionId: cpm_trans_id, // Clé d'idempotence future
                        confirmedAt: new Date()
                    }
                })
            ]);

            await tracker.trackAction("WALLET_RECHARGED", "OWNER", userId, { amount, tx: cpm_trans_id });
        }

        // --- SCÉNARIO B : FRAIS DE DOSSIER (LOCATAIRE) ---
        else if (metadata.type === 'FRAIS_DOSSIER') {
            const leaseId = metadata.leaseId;

            // Activation du Bail + Enregistrement Paiement
            await prisma.$transaction([
                prisma.lease.update({
                    where: { id: leaseId },
                    data: { status: 'ACTIVE', isActive: true }
                }),
                prisma.payment.create({
                    data: {
                        amount: amount,
                        month: 'FRAIS_DOSSIER',
                        type: 'FEES', // Type spécial pour les revenus plateforme
                        leaseId: leaseId,
                        status: 'COMPLETED',
                        transactionId: cpm_trans_id,
                        paidAt: new Date()
                    }
                })
                // Note: Ici, 100% va à ImmoFacile, pas de crédit propriétaire
            ]);
            
            await tracker.trackAction("FEES_PAID", "TENANT", metadata.userId, { leaseId, amount });
        }

        // --- SCÉNARIO C : PAIEMENT LOYER (SPLIT AUTOMATIQUE - PRÉPARATION V5) ---
        else if (metadata.type === 'LOYER_DIRECT') {
            const leaseId = metadata.leaseId;

            // 1. On récupère les infos pour savoir qui payer
            const lease = await prisma.lease.findUnique({
                where: { id: leaseId },
                include: {
                    property: {
                        select: { ownerId: true, managedById: true } // On vérifie s'il y a un agent
                    }
                }
            });

            if (!lease) {
                console.error(`❌ Webhook Split: Bail introuvable ${leaseId}`);
                return res.sendStatus(200);
            }

            // 2. Calculs Mathématiques (Frais Plateforme & Agent)
            const platformShare = Math.floor(amount * 0.05); // 5% pour ImmoFacile
            let agentShare = 0;
            let ownerShare = 0;

            const agentId = lease.property.managedById;

            if (agentId) {
                // S'il y a un agent : 5% Agent, le reste au Propriétaire (90%)
                agentShare = Math.floor(amount * 0.05);
                ownerShare = amount - platformShare - agentShare;
            } else {
                // Pas d'agent : Le propriétaire récupère 95%
                ownerShare = amount - platformShare;
            }

            // 3. Transactions Atomiques (Tout ou rien)
            const transactions = [
                // A. Créditer le Propriétaire
                prisma.user.update({
                    where: { id: lease.property.ownerId },
                    data: { walletBalance: { increment: ownerShare } }
                }),
                
                // B. Enregistrer le paiement du Loyer
                prisma.payment.create({
                    data: {
                        amount: amount,
                        month: new Date().toLocaleString('fr-FR', { month: 'long' }), // Mois courant
                        type: 'LOYER',
                        leaseId: leaseId,
                        status: 'COMPLETED',
                        transactionId: cpm_trans_id,
                        paidAt: new Date()
                    }
                })
            ];

            // C. Créditer l'Agent (si applicable)
            if (agentId && agentShare > 0) {
                transactions.push(
                    prisma.user.update({
                        where: { id: agentId },
                        data: { walletBalance: { increment: agentShare } }
                    })
                );
            }

            // Exécution sécurisée
            await prisma.$transaction(transactions);

            // 4. Traçabilité (Mouchard)
            await tracker.trackAction("RENT_AUTO_SPLIT", "SYSTEM", metadata.userId, { 
                total: amount,
                ownerReceived: ownerShare,
                agentReceived: agentShare,
                platformFees: platformShare
            });
        }

        res.sendStatus(200);

    } catch (error) {
        console.error("❌ Erreur Critique Webhook:", error);
        res.sendStatus(500); // Pour que CinetPay réessaie
        
        // Toujours répondre 200 à la fin
    res.sendStatus(200);
};
    }

