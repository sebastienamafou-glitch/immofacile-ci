const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Envoie l'email de bienvenue avec les accès V4
 */
exports.sendWelcomeEmail = async (tenantData) => {
    const msg = {
        to: tenantData.email,
        from: 'noreply@immofacile-ci.com',
        subject: 'Bienvenue sur ImmoFacile CI - Vos accès locataire',
        html: `
            <div style="font-family: sans-serif; max-width: 600px;">
                <h1 style="color: #0B1120;">Bienvenue ${tenantData.name} !</h1>
                <p>Votre bail pour le logement <strong>${tenantData.propertyName}</strong> a été officiellement scellé numériquement (V4).</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0;"><strong>Vos identifiants :</strong></p>
                    <p>Email : ${tenantData.email}</p>
                    <p>Mot de passe temporaire : <strong>${tenantData.tempPassword}</strong></p>
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
                    Ce bail est certifié conforme à la <strong>Loi 2024-1115</strong>. Empreinte SHA-256 : <br>
                    <code>${tenantData.hash}</code>
                </p>
                <a href="https://immofacile-ci.vercel.app/login" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">Accéder à mon espace</a>
            </div>
        `,
    };
    return sgMail.send(msg);
};
