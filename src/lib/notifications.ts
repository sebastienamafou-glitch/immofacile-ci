import { prisma } from "@/lib/prisma";

// Types de notifications pour garder une cohérence
export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string; // Lien de redirection (ex: /dashboard/tenant)
}

/**
 * Envoie une notification à un utilisateur (DB + Email)
 */
export async function sendNotification({ 
  userId, 
  title, 
  message, 
  type = "INFO", 
  link 
}: NotificationPayload) {
  try {
    // 1. CRÉATION EN BASE DE DONNÉES (In-App)
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
        isRead: false,
      }
    });

    // 2. ENVOI EMAIL (Simulation / Placeholder)
    // Ici, vous connecterez plus tard Resend, SendGrid ou Nodemailer.
    // Pour l'instant, on simule l'envoi pour ne pas bloquer le flux.
    console.log(`📧 [EMAIL SIMULATION] To: ${userId} | Subject: ${title} | Body: ${message}`);
    
    // Exemple d'intégration future :
    // await resend.emails.send({ to: userEmail, subject: title, html: ... });

    return { success: true, notification };

  } catch (error) {
    console.error("🔥 Erreur lors de l'envoi de la notification:", error);
    // On ne veut pas bloquer l'action principale si la notif échoue
    return { success: false };
  }
}

/**
 * Marque toutes les notifications comme lues pour un utilisateur
 */
export async function markAllAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
