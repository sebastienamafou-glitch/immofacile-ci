import nodemailer from 'nodemailer';

// 1. VÉRIFICATION DE LA CONFIGURATION (Crash au démarrage si manquant)
const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.warn(`⚠️ ALERTE EMAIL: Variables manquantes: ${missingVars.join(', ')}. Les emails ne partiront pas.`);
}

// 2. CRÉATION DU TRANSPORTEUR
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true pour 465, false pour 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 3. TEMPLATE DE BASE (Pour le look & feel ImmoFacile)
const wrapHtml = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background-color: #0f172a; padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
    .header span { color: #f97316; } /* Orange ImmoFacile */
    .content { padding: 40px 30px; color: #334155; line-height: 1.6; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    .btn { display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .info-box { background-color: #f1f5f9; padding: 15px; border-radius: 8px; border-left: 4px solid #f97316; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>IMMO<span>FACILE</span></h1>
    </div>
    <div class="content">
      <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ImmoFacile. Tous droits réservés.</p>
      <p>Abidjan, Côte d'Ivoire</p>
    </div>
  </div>
</body>
</html>
`;

// Interface pour les paramètres d'email
interface EmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer | string }[]; // ✅ AJOUT CRUCIAL
}

// 4. FONCTION GÉNÉRIQUE D'ENVOI
async function sendEmail({ to, subject, html, attachments }: EmailParams) {
  try {
    const info = await transporter.sendMail({
      from: `"ImmoFacile" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html,
      attachments, // ✅ On passe les pièces jointes à Nodemailer
    });
    console.log(`✅ Email envoyé à ${to} (ID: ${info.messageId})`);
    return { success: true };
  } catch (error) {
    console.error("❌ Erreur envoi email:", error);
    return { success: false, error };
  }
}

// ============================================================
// 5. FONCTIONS MÉTIERS SPÉCIFIQUES
// ============================================================

export async function sendCredentialsEmail(email: string, name: string, pass: string, role: string) {
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL + "/login";
  
  const content = `
    <p>Bonjour <strong>${name}</strong>,</p>
    <p>Votre compte <strong>${role}</strong> a été créé avec succès sur ImmoFacile.</p>
    <div class="info-box">
      <p style="margin:5px 0"><strong>Identifiant :</strong> ${email}</p>
      <p style="margin:5px 0"><strong>Mot de passe :</strong> ${pass}</p>
    </div>
    <p>Veuillez vous connecter et modifier votre mot de passe dès que possible.</p>
    <div style="text-align: center;">
      <a href="${loginUrl}" class="btn">Accéder à mon espace</a>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Bienvenue sur ImmoFacile - Vos accès",
    html: wrapHtml(content, "Bienvenue !"),
  });
}

// ✅ NOUVELLE FONCTION POUR ENVOYER LE PDF
export async function sendPaymentReceiptWithPdf(
    email: string, 
    name: string, 
    receiptRef: string, 
    pdfBuffer: Buffer // Le fichier PDF généré
) {
  const content = `
    <p>Bonjour ${name},</p>
    <p>Nous confirmons la bonne réception de votre paiement (Réf: ${receiptRef}).</p>
    <p><strong>Vous trouverez votre quittance certifiée en pièce jointe de cet email.</strong></p>
    <p>Cordialement,<br>L'équipe ImmoFacile.</p>
  `;

  return sendEmail({
    to: email,
    subject: `Reçu de Paiement - ${receiptRef}`,
    html: wrapHtml(content, "Quittance Disponible"),
    attachments: [
        {
            filename: `Quittance_${receiptRef}.pdf`,
            content: pdfBuffer
        }
    ]
  });
}

export async function sendContractNotification(email: string, name: string, leaseId: string) {
  const contractUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/contract/${leaseId}`;
  
  const content = `
    <p>Bonjour ${name},</p>
    <p>Votre contrat de bail est prêt et nécessite votre signature électronique.</p>
    <div style="text-align: center;">
      <a href="${contractUrl}" class="btn">Lire et Signer le Contrat</a>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Action requise : Signature de votre bail",
    html: wrapHtml(content, "Contrat Disponible"),
  });
}

export async function sendOwnerIncomeNotification(email: string, ownerName: string, amount: number, tenantName: string) {
    const content = `
      <p>Bonjour ${ownerName},</p>
      <p>Bonne nouvelle ! Vous venez de recevoir un paiement de loyer de ${tenantName}.</p>
      <div class="info-box">
        <p style="margin:5px 0"><strong>Montant :</strong> ${amount.toLocaleString('fr-FR')} FCFA</p>
      </div>
    `;
  
    return sendEmail({
      to: email,
      subject: "💰 Nouveau paiement reçu",
      html: wrapHtml(content, "Encaissement Loyer"),
    });
}
