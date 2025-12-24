// src/controllers/paymentController.js
const prisma = require('../prisma/client');
const axios = require('axios');
const tracker = require('../utils/tracker'); // ✅ C'EST ACTIVÉ MAINTENANT

// Helper pour appeler l'API CinetPay (évite la duplication de code)
const callCinetPay = async (payload) => {
    try {
        const response = await axios.post('https://api-checkout.cinetpay.com/v2/payment', payload);
        return response.data;
    } catch (error) {
        console.error("Erreur API CinetPay:", error.response?.data || error.message);
        throw new Error("Erreur de communication avec CinetPay");
    }
};

// 1. Logique d'encaissement manuel (Loyer) - Côté Propriétaire
exports.postPayRent = async (req, res) => {
    const { leaseId, amount, month } = req.body;
    const rentAmount = parseInt(amount);
    const userId = req.session.user.id;
    const COMMISSION_RATE = 0.05; 

    try {
        const owner = await prisma.user.findUnique({ where: { id: userId } });
        const commission = Math.round(rentAmount * COMMISSION_RATE);

        if (owner.walletBalance < commission) {
            return res.status(402).render('errors/insufficient-funds', { 
                commission, 
                currentCredit: owner.walletBalance 
            });
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { walletBalance: { decrement: commission } } 
            }),
            prisma.creditTransaction.create({
                data: {
                    amount: -commission,
                    description: `Commission Loyer ${month}`,
                    userId: userId
                }
            }),
            prisma.payment.create({
                data: { 
                    amount: rentAmount, 
                    month: month, 
                    leaseId: leaseId,
                    type: "LOYER"
                }
            })
        ]);

        // ✅ LOG D'ACTIVITÉ
        await tracker.trackAction("RENT_COLLECTED", "OWNER", userId, { 
            amount: rentAmount, 
            leaseId 
        });

        res.redirect('/owner/dashboard?success=payment_recorded');

    } catch (error) {
        console.error("❌ Erreur Encaissement:", error);
        res.redirect('/owner/dashboard?error=payment_failed');
    }
};

// 2. Initialisation CINETPAY (Rechargement Compte Propriétaire)
exports.initCinetPay = async (req, res) => {
    const amount = parseInt(req.body.amount);
    const transactionId = `TRANS_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const SITE_URL = process.env.APP_URL || 'http://localhost:3000'; 

    const data = {
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id: transactionId,
        amount: amount,
        currency: 'XOF',
        description: `Rechargement ImmoFacile - ${req.session.user.name}`,
        customer_id: req.session.user.id,
        customer_name: req.session.user.name,
        notify_url: `${SITE_URL}/api/payment/notify`, // Webhook
        return_url: `${SITE_URL}/owner/dashboard?success=recharge_pending`,
        channels: 'ALL',
        // METADATA : C'est ici qu'on dit "C'est un rechargement de wallet"
        metadata: JSON.stringify({ 
            type: 'WALLET_RECHARGE', 
            userId: req.session.user.id 
        })
    };

    try {
        const result = await callCinetPay(data);
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

// 3. Paiement des Frais de Dossier (Locataire)
exports.payApplicationFees = async (req, res) => {
    const { leaseId } = req.body;
    const FEES_AMOUNT = 20000; // Tarif fixe
    const user = req.session.user;
    const SITE_URL = process.env.APP_URL || 'http://localhost:3000';

    const transactionId = `FEES_${leaseId}_${Date.now()}`;

    const data = {
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id: transactionId,
        amount: FEES_AMOUNT,
        currency: 'XOF',
        description: `Frais de dossier Bail #${leaseId.slice(-6)}`,
        customer_name: user.name,
        customer_email: user.email,
        customer_phone_number: user.phone,
        notify_url: `${SITE_URL}/api/payment/notify`,
        return_url: `${SITE_URL}/tenant/dashboard?success=fees_paid`,
        channels: 'ALL',
        // METADATA : C'est ici qu'on dit "C'est des frais de dossier"
        metadata: JSON.stringify({ 
            type: 'FRAIS_DOSSIER', 
            leaseId: leaseId,
            userId: user.id 
        })
    };

    try {
        const result = await callCinetPay(data);
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

// 4. Webhook CINETPAY (Le Cerveau Central) 🧠
exports.webhookCinetPay = async (req, res) => {
    // CinetPay envoie les données en POST dans le body
    const { cpm_trans_id } = req.body;

    // Si pas de trans_id, on ignore (protection)
    if (!cpm_trans_id) return res.sendStatus(400);

    try {
        // A. Vérification officielle de la transaction
        const verification = await axios.post('https://api-checkout.cinetpay.com/v2/payment/check', {
            apikey: process.env.CINETPAY_API_KEY,
            site_id: process.env.CINETPAY_SITE_ID,
            transaction_id: cpm_trans_id
        });

        const { code, data } = verification.data;

        // B. Si le paiement est VALIDÉ ('00')
        if (code === '00') { 
            const amountPaid = parseInt(data.amount);
            const metadata = JSON.parse(data.metadata); // On récupère nos infos cachées

            console.log(`🔔 Webhook reçu : Type=${metadata.type}, Montant=${amountPaid}`);

            // SCÉNARIO 1 : Rechargement du Portefeuille Propriétaire
            if (metadata.type === 'WALLET_RECHARGE') {
                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: metadata.userId },
                        data: { walletBalance: { increment: amountPaid } }
                    }),
                    prisma.creditTransaction.create({
                        data: {
                            amount: amountPaid,
                            description: `Rechargement Mobile Money (Ref: ${cpm_trans_id})`,
                            userId: metadata.userId
                        }
                    })
                ]);
                
                // ✅ LOG
                await tracker.trackAction("WALLET_RECHARGED", "OWNER", metadata.userId, { 
                    amount: amountPaid, 
                    ref: cpm_trans_id 
                });
            }

            // SCÉNARIO 2 : Paiement des Frais de Dossier Locataire (ACTIVATION BAIL)
            else if (metadata.type === 'FRAIS_DOSSIER') {
                await prisma.$transaction([
                    // 1. Enregistrer la trace du paiement
                    prisma.payment.create({
                        data: {
                            amount: amountPaid,
                            type: 'FRAIS_DOSSIER', 
                            leaseId: metadata.leaseId,
                            month: 'FRAIS_ENTREE'
                        }
                    }),
                    // 2. ACTIVER LE BAIL (C'est le plus important !)
                    prisma.lease.update({
                        where: { id: metadata.leaseId },
                        data: { 
                            status: 'ACTIVE', 
                            isActive: true 
                        }
                    })
                ]);
                console.log(`✅ Bail ${metadata.leaseId} activé après paiement des frais.`);
                
                // ✅ LOG
                await tracker.trackAction("FEES_PAID", "TENANT", metadata.userId, { 
                    leaseId: metadata.leaseId 
                });
            }
        }
    } catch (error) {
        console.error("❌ Webhook Error:", error.message);
    }
    
    // Toujours répondre 200 à CinetPay pour qu'il arrête d'envoyer la notif
    res.sendStatus(200);
};
