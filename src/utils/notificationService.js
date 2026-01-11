const nodemailer = require('nodemailer');
const twilio = require('twilio');

// 1. Configuration Email (SMTP)
const mailTransporter = nodemailer.createTransport({
    service: 'gmail', // Ou votre pro host (OVH, Ionos...)
    auth: {
        user: process.env.EMAIL_USER, // ex: notification@immofacile.ci
        pass: process.env.EMAIL_PASS
    }
});

// 2. Configuration WhatsApp (Twilio)
// Note: Pour un MVP gratuit, vous utiliserez la Sandbox Twilio.
// Pour la prod, il faudra un compte validé.
const whatsappClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

const NotificationService = {
    
    // --- ENVOI EMAIL (Avec PDF en pièce jointe) ---
    async sendEmailReceipt(toEmail, tenantName, pdfBuffer, receiptRef) {
        try {
            await mailTransporter.sendMail({
                from: '"ImmoFacile Compta" <no-reply@immofacile.ci>',
                to: toEmail,
                subject: `Reçu de Paiement - ${receiptRef}`,
                html: `
                    <h3>Bonjour ${tenantName},</h3>
                    <p>Nous confirmons la bonne réception de votre paiement.</p>
                    <p>Vous trouverez ci-joint votre <strong>Quittance de Loyer certifiée</strong>.</p>
                    <p>Cordialement,<br>L'équipe ImmoFacile.</p>
                `,
                attachments: [
                    {
                        filename: `Quittance_${receiptRef}.pdf`,
                        content: pdfBuffer // Le PDF généré à la volée
                    }
                ]
            });
            console.log(`📧 Email envoyé à ${toEmail}`);
        } catch (error) {
            console.error("Erreur Envoi Email:", error);
        }
    },

    // --- ENVOI WHATSAPP (Message court + Lien) ---
    async sendWhatsAppConfirm(toPhone, tenantName, amount, downloadLink) {
        try {
            // Formatage du numéro (ex: 0707... -> +2250707...)
            const formattedPhone = toPhone.startsWith('+') ? toPhone : `+225${toPhone}`;

            await whatsappClient.messages.create({
                from: 'whatsapp:+14155238886', // Numéro Twilio (Sandbox)
                to: `whatsapp:${formattedPhone}`,
                body: `✅ *Paiement Reçu !*
                
Bonjour ${tenantName},
Nous avons bien reçu votre règlement de *${amount.toLocaleString()} FCFA*.

📄 Votre quittance est disponible ici :
${downloadLink}

Merci de votre confiance.
_ImmoFacile_`
            });
            console.log(`💬 WhatsApp envoyé à ${formattedPhone}`);
        } catch (error) {
            console.error("Erreur Envoi WhatsApp:", error);
        }
    }
};

module.exports = NotificationService;
