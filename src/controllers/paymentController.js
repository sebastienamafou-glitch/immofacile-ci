// controllers/paymentController.js
const prisma = require('../prisma/client');
const axios = require('axios');

// 1. Logique d'encaissement manuel (Loyer)
exports.postPayRent = async (req, res) => {
    const { leaseId, amount, month } = req.body;
    const rentAmount = parseFloat(amount);
    const userId = req.session.user.id;
    const COMMISSION_RATE = 0.05; 

    try {
        const owner = await prisma.user.findUnique({ where: { id: userId } });
        const commission = rentAmount * COMMISSION_RATE;

        // --- CORRECTION SCHEMA : credit -> walletBalance ---
        if (owner.walletBalance < commission) {
            // Pas assez de fonds dans le portefeuille pour payer la com'
            return res.status(402).render('errors/insufficient-funds', { 
                commission, 
                currentCredit: owner.walletBalance 
            });
        }

        // Transaction Atomique
        await prisma.$transaction([
            // 1. Débit Owner (Commission)
            prisma.user.update({
                where: { id: userId },
                data: { walletBalance: { decrement: commission } } 
            }),
            // 2. Historique Transaction
            prisma.creditTransaction.create({
                data: {
                    amount: -commission,
                    description: `Commission Loyer ${month}`,
                    userId: userId
                }
            }),
            // 3. Création Preuve Paiement
            prisma.payment.create({
                data: { amount: rentAmount, month, leaseId }
            })
        ]);

        res.redirect('/owner/dashboard?success=payment_recorded');

    } catch (error) {
        console.error("Erreur Encaissement:", error);
        res.redirect('/owner/dashboard?error=payment_failed');
    }
};

// 2. Intégration CINETPAY (Initialisation)
exports.initCinetPay = async (req, res) => {
    const amount = parseInt(req.body.amount);
    const transactionId = Math.floor(Math.random() * 100000000).toString();
    const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'; 

    const data = {
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id: transactionId,
        amount: amount,
        currency: 'XOF',
        description: `Rechargement ${req.session.user.name}`,
        customer_id: req.session.user.id,
        customer_name: req.session.user.name,
        notify_url: `${SITE_URL}/api/payment/notify`, 
        return_url: `${SITE_URL}/owner/dashboard`,
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
            const amountPaid = parseFloat(data.amount);
            const userId = JSON.parse(data.metadata).userId;

            // --- CORRECTION SCHEMA : credit -> walletBalance ---
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
            console.log(`✅ Compte rechargé : ${amountPaid} FCFA pour User ${userId}`);
        }
    } catch (error) {
        console.error("Webhook Error:", error.message);
    }
    
    res.sendStatus(200);
};
