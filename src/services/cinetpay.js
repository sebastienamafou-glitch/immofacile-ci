const axios = require('axios');

class CinetPayService {
    constructor() {
        this.apiKey = process.env.CINETPAY_API_KEY;
        this.siteId = process.env.CINETPAY_SITE_ID;
        this.baseUrl = 'https://api-checkout.cinetpay.com/v2/payment';
    }

    async initPayment({ transactionId, amount, description, customerEmail, customerPhone, customerName }) {
        try {
            const payload = {
                apikey: this.apiKey,
                site_id: this.siteId,
                transaction_id: transactionId,
                amount: amount,
                currency: "XOF",
                description: description,
                // URLs importantes
                return_url: `${process.env.APP_URL}/owner/dashboard?payment=success`,
                notify_url: `${process.env.APP_URL}/api/payment/notify`, // Le Webhook
                // Infos client
                customer_name: customerName,
                customer_surname: "", // Optionnel
                customer_email: customerEmail || "client@immofacile.ci",
                customer_phone_number: customerPhone || "0700000000",
                customer_address: "Abidjan",
                customer_city: "Abidjan",
                customer_country: "CI",
                channels: "ALL"
            };

            const response = await axios.post(this.baseUrl, payload);
            return response.data; // Contient le lien de paiement
        } catch (error) {
            console.error("Erreur Init CinetPay:", error.response?.data || error.message);
            throw new Error("Impossible d'initialiser le paiement");
        }
    }

    async verifyPayment(transactionId) {
        try {
            const payload = {
                apikey: this.apiKey,
                site_id: this.siteId,
                transaction_id: transactionId
            };
            
            // Endpoint de vérification différent
            const response = await axios.post('https://api-checkout.cinetpay.com/v2/payment/check', payload);
            return response.data;
        } catch (error) {
            console.error("Erreur Vérif CinetPay:", error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new CinetPayService();
