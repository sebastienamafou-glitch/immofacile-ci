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

// AJOUT : Notification d'incident pour le propriétaire
exports.sendIncidentNotification = async (ownerEmail, ownerName, tenantName, propertyTitle, incidentTitle, priority) => {
    
    // Code couleur selon l'urgence
    let color = "#3b82f6"; // Bleu (Normal)
    if (priority === 'HIGH') color = "#f97316"; // Orange
    if (priority === 'URGENT') color = "#ef4444"; // Rouge

    const mailOptions = {
        from: '"Alerte ImmoFacile" <contact@webappci.com>',
        to: ownerEmail,
        subject: `🚨 Incident ${priority} : ${propertyTitle}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: ${color};">Nouvel Incident Signalé</h2>
                <p>Bonjour <strong>${ownerName}</strong>,</p>
                <p>Votre locataire <strong>${tenantName}</strong> vient de signaler un problème sur le bien :</p>
                <p style="background: #f3f4f6; padding: 10px; border-radius: 5px; font-weight: bold;">
                    🏠 ${propertyTitle}
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                
                <p><strong>Objet :</strong> ${incidentTitle}</p>
                <p><strong>Priorité :</strong> <span style="color:${color}; font-weight:bold;">${priority}</span></p>
                
                <a href="${process.env.SITE_URL || 'http://localhost:3000'}/owner/dashboard" 
                   style="display: inline-block; background: #0B1120; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">
                   Voir le détail & Répondre
                </a>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Alerte incident envoyée à ${ownerEmail}`);
    } catch (error) {
        console.error("❌ Erreur envoi email incident:", error);
        // On ne bloque pas l'application si l'email échoue, on log juste l'erreur
    }
};
