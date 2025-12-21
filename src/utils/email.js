const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false }
});

exports.sendResetEmail = async (to, token, host) => {
    const resetLink = `http://${host}/reset-password/${token}`;
    const mailOptions = {
        from: '"Sécurité ImmoFacile CI" <contact@webappci.com>',
        to: to,
        subject: '🔐 Réinitialisation de votre mot de passe',
        html: `<p>Cliquez ici : <a href="${resetLink}">Réinitialiser</a></p>`
    };
    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("❌ Erreur envoi email:", error);
    }
};