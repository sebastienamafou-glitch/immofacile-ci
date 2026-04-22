import nodemailer from 'nodemailer';

// ============================================================
// 1. UTILITAIRES DE SÉCURITÉ
// ============================================================

// 🛡️ Protection XSS : Échappe les caractères spéciaux HTML
// Empêche qu'un utilisateur nommé "<script>..." ne casse l'email
const escapeHtml = (text: string | null | undefined) => {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// 2. CONFIGURATION & TRANSPORT
// ============================================================

const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.warn(`⚠️ ALERTE EMAIL: Variables manquantes: ${missingVars.join(', ')}. Les emails ne partiront pas.`);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 3. TEMPLATE DE BASE (Sécurisé)
const wrapHtml = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background-color: #0f172a; padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
    .header span { color: #f97316; } 
    .content { padding: 40px 30px; color: #334155; line-height: 1.6; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    .btn { display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .info-box { background-color: #f1f5f9; padding: 15px; border-radius: 8px; border-left: 4px solid #f97316; margin: 20px 0; }
    .warning-box { background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; color: #991b1b; margin: 20px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>IMMO<span>FACILE</span></h1>
    </div>
    <div class="content">
      <h2 style="color: #0f172a; margin-top: 0;">${escapeHtml(title)}</h2>
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Babimmo. Tous droits réservés.</p>
      <p>Abidjan, Côte d'Ivoire</p>
    </div>
  </div>
</body>
</html>
`;

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer | string; contentType?: string }[];
}

async function sendEmail({ to, subject, html, attachments }: EmailParams) {
  try {
    const info = await transporter.sendMail({
      from: `"Babimmo" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html,
      attachments,
    });
    console.log(`✅ Email envoyé à ${to} (ID: ${info.messageId})`);
    return { success: true };
  } catch (error) {
    console.error("❌ Erreur envoi email:", error);
    return { success: false, error };
  }
}

// ============================================================
// 4. FONCTIONS MÉTIERS (SÉCURISÉES)
// ============================================================

/**
 * ✅ REMPLACEMENT SÉCURISÉ de sendCredentialsEmail
 * Au lieu d'envoyer le mot de passe, on envoie un lien d'activation unique.
 * Pré-requis : Générer un token côté serveur et le passer ici.
 */
export async function sendAccountActivationEmail(email: string, name: string, token: string, role: string) {
  // Lien vers ta page frontend : /auth/new-password?token=xyz
  const activationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/new-password?token=${token}`;
  
  const content = `
    <p>Bonjour <strong>${escapeHtml(name)}</strong>,</p>
    <p>Votre compte <strong>${escapeHtml(role)}</strong> a été créé par un administrateur.</p>
    <p>Pour sécuriser votre accès, vous devez définir votre mot de passe personnel en cliquant ci-dessous :</p>
    
    <div style="text-align: center;">
      <a href="${activationUrl}" class="btn">Définir mon mot de passe</a>
    </div>

    <p style="font-size: 12px; margin-top: 20px;">Ce lien est valide pour 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
  `;

  return sendEmail({
    to: email,
    subject: "Action requise : Activation de votre compte",
    html: wrapHtml(content, "Bienvenue !"),
  });
}

/**
 * ⚠️ VERSION DEPRECATED (À utiliser uniquement si tu n'as pas encore le système de token)
 * Si tu dois absolument utiliser celle-ci, elle inclut au moins un avertissement de sécurité.
 */
export async function sendCredentialsEmail_LEGACY_UNSAFE(email: string, name: string, pass: string, role: string) {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;
    
    const content = `
      <p>Bonjour <strong>${escapeHtml(name)}</strong>,</p>
      <p>Votre compte <strong>${escapeHtml(role)}</strong> a été créé.</p>
      
      <div class="warning-box">
        ⚠️ SÉCURITÉ : Ce mot de passe est temporaire. Veuillez le changer immédiatement après votre première connexion.
      </div>

      <div class="info-box">
        <p style="margin:5px 0"><strong>Identifiant :</strong> ${escapeHtml(email)}</p>
        <p style="margin:5px 0"><strong>Mot de passe temporaire :</strong> ${escapeHtml(pass)}</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${loginUrl}" class="btn">Se connecter maintenant</a>
      </div>
    `;
  
    return sendEmail({
      to: email,
      subject: "Vos accès temporaires Babimmo",
      html: wrapHtml(content, "Bienvenue"),
    });
}

export async function sendPaymentReceiptWithPdf(
    email: string, 
    name: string, 
    receiptRef: string, 
    pdfBuffer: Buffer
) {
  const safeName = escapeHtml(name);
  const safeRef = escapeHtml(receiptRef);

  const content = `
    <p>Bonjour ${safeName},</p>
    <p>Nous confirmons la bonne réception de votre paiement (Réf: <strong>${safeRef}</strong>).</p>
    <p>Vous trouverez votre quittance certifiée en pièce jointe de cet email.</p>
    <p>Cordialement,<br>L'équipe Babimmo.</p>
  `;

  return sendEmail({
    to: email,
    subject: `Reçu de Paiement - ${safeRef}`,
    html: wrapHtml(content, "Quittance Disponible"),
    attachments: [
        {
            filename: `Quittance_${safeRef}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }
    ]
  });
}

export async function sendContractNotification(email: string, name: string, leaseId: string) {
  const contractUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/contract/${leaseId}`;
  
  const content = `
    <p>Bonjour ${escapeHtml(name)},</p>
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
      <p>Bonjour ${escapeHtml(ownerName)},</p>
      <p>Bonne nouvelle ! Vous venez de recevoir un paiement de loyer de <strong>${escapeHtml(tenantName)}</strong>.</p>
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

export async function sendCredentialsEmail(email: string, name: string, pass: string, role: string) {
    return sendCredentialsEmail_LEGACY_UNSAFE(email, name, pass, role);
}

export async function sendRentReminderEmail(
    email: string, 
    tenantName: string, 
    amount: number, 
    propertyTitle: string, 
    expectedDate: Date
) {
  const safeName = escapeHtml(tenantName);
  const safeTitle = escapeHtml(propertyTitle);
  const formattedDate = expectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const content = `
    <p>Bonjour ${safeName},</p>
    <p>Sauf erreur ou omission de notre part, nous n'avons pas encore reçu le règlement de votre loyer de <strong>${amount.toLocaleString()} FCFA</strong> concernant le bien "${safeTitle}" pour le mois de ${formattedDate}.</p>
    
    <div class="warning-box">
      ⚠️ Merci de régulariser votre situation dans les plus brefs délais pour éviter l'application de pénalités de retard conformément à votre contrat de bail.
    </div>

    <p>Si vous avez déjà effectué ce paiement entre-temps, veuillez ignorer ce message.</p>
    <p>Cordialement,<br>Votre Agence Gestionnaire.</p>
  `;

  return sendEmail({
    to: email,
    subject: `🔔 Rappel de loyer impayé - ${safeTitle}`,
    html: wrapHtml(content, "Rappel de Loyer"),
  });
}
