// src/controllers/paymentController.js
const prisma = require('../prisma/client');
const axios = require('axios');
const tracker = require('../utils/tracker'); // NOUVEAU : Pour le BI Tracking

// 1. Logique d'encaissement manuel (Loyer)
exports.postPayRent = async (req, res) => {
    const { leaseId, amount, month } = req.body;
    const rentAmount = parseInt(amount); // CORRECTION : Utilisation de Int (Audit)
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

        // TRANSACTION ATOMIQUE CORRIGÉE (Audit & Logs)
        await prisma.$transaction([
            // A. Débit de la commission seule (Structure simplifiée pour Prisma)
            prisma.user.update({
                where: { id: userId },
                data: { walletBalance: { decrement: commission } } 
            }),
            // B. Historique de débit
            prisma.creditTransaction.create({
                data: {
                    amount: -commission,
                    description: `Commission Loyer ${month}`,
                    userId: userId
                }
            }),
            // C. Création de la quittance
            prisma.payment.create({
                data: { 
                    amount: rentAmount, 
                    month: month, 
                    leaseId: leaseId,
                    type: "LOYER"
                }
            })
        ]);

        // TRACKING BUSINESS INTELLIGENCE
        await tracker.trackAction("RENT_COLLECTED", "OWNER", userId, { 
            amount: rentAmount, 
            leaseId: leaseId 
        });

        res.redirect('/owner/dashboard?success=payment_recorded');

    } catch (error) {
        console.error("❌ Erreur Prisma Encaissement:", error);
        res.redirect('/owner/dashboard?error=payment_failed');
    }
};

// 2. Intégration CINETPAY (Initialisation)
exports.initCinetPay = async (req, res) => {
    const amount = parseInt(req.body.amount);
    const transactionId = `TRANS_${Date.now()}_${Math.floor(Math.random() * 1000)}`; // Plus robuste
    const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'; 

    const data = {
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id: transactionId,
        amount: amount,
        currency: 'XOF',
        description: `Rechargement ImmoFacile - ${req.session.user.name}`,
        customer_id: req.session.user.id,
        customer_name: req.session.user.name,
        notify_url: `${SITE_URL}/api/payment/notify`, 
        return_url: `${SITE_URL}/owner/dashboard?success=recharge_pending`,
        channels: 'ALL',
        metadata: JSON.stringify({ userId: req.session.user.id })
    };

    try {
        const response = await axios.post('https://api-checkout.cinetpay.com/v2/payment', data);
        if (response.data.code === '201') {
            res.redirect(response.data.data.payment_url);
        } else {
            throw new Error(response.data.description);
        }
    } catch (error) {
        console.error("CinetPay Init Error:", error);
        res.status(500).send("Erreur initialisation paiement");
    }
};

// 3. Webhook CINETPAY (Validation Sécurisée)
exports.webhookCinetPay = async (req, res) => {
    const { cpm_trans_id } = req.body;

    try {
        const verification = await axios.post('https://api-checkout.cinetpay.com/v2/payment/check', {
            apikey: process.env.CINETPAY_API_KEY,
            site_id: process.env.CINETPAY_SITE_ID,
            transaction_id: cpm_trans_id
        });

        const { code, data } = verification.data;

        if (code === '00') { 
            const amountPaid = parseInt(data.amount); // CORRECTION : Int
            const userId = JSON.parse(data.metadata).userId;

            await prisma.$transaction([
                prisma.user.update({
                    where: { id: userId },
                    data: { walletBalance: { increment: amountPaid } }
                }),
                prisma.creditTransaction.create({
                    data: {
                        amount: amountPaid,
                        description: `Rechargement en ligne (Ref: ${cpm_trans_id})`,
                        userId: userId
                    }
                })
            ]);

            // TRACKING BUSINESS INTELLIGENCE
            await tracker.trackAction("WALLET_RECHARGED", "OWNER", userId, { 
                amount: amountPaid, 
                ref: cpm_trans_id 
            });

            console.log(`✅ Compte rechargé : ${amountPaid} FCFA pour User ${userId}`);
        }
    } catch (error) {
        console.error("Webhook Error:", error.message);
    }
    
    res.sendStatus(200);
};
