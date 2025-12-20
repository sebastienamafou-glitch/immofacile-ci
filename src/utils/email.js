const nodemailer = require('nodemailer');

// Configuration SMTP Universelle (Pour domaine pro)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true', // true pour 465, false pour les autres
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        // Utile si vous êtes en local et que le certificat SSL du serveur mail est auto-signé
        // En prod, essayez de le laisser à false ou supprimez cette ligne si possible
        rejectUnauthorized: false 
    }
});

exports.sendResetEmail = async (to, token, host) => {
    const resetLink = `http://${host}/reset-password/${token}`;

    const mailOptions = {
        from: '"Sécurité ImmoFacile CI" <contact@webappci.com>', // Votre adresse pro
        to: to,
        subject: '🔐 Réinitialisation de votre mot de passe',
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0B1120;">Mot de passe oublié ?</h2>
                <p>Vous avez demandé la réinitialisation de votre mot de passe <strong>ImmoFacile CI</strong>.</p>
                <p>Cliquez sur le lien ci-dessous pour en définir un nouveau (valable 1 heure) :</p>
                <a href="${resetLink}" style="display: inline-block; background: #F59E0B; color: #0B1120; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Réinitialiser mon mot de passe</a>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 10px; color: #999;">Ceci est un message automatique envoyé par contact@webappci.com</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Email envoyé à ${to}`);
    } catch (error) {
        console.error("❌ Erreur envoi email:", error);
        throw error; // On renvoie l'erreur pour l'afficher au controller
    }
};
