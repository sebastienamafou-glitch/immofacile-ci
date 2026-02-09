import { auth } from "@/auth"; // ou votre méthode pour récupérer la session
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

type LogAction = 
  | "KYC_VALIDATED" 
  | "KYC_REJECTED" 
  | "PAYMENT_SUCCESS" 
  | "PAYMENT_FAILED"
  | "USER_DELETED"
  | "ADMIN_LOGIN";

interface LogOptions {
  action: LogAction;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, any>;
  userId?: string; // Optionnel si on peut le récupérer de la session
}

export async function logActivity({ action, entityId, entityType, metadata, userId }: LogOptions) {
  try {
    // 1. Essayer de récupérer l'auteur de l'action
    let actorId = userId;
    let actorEmail = "system@immofacile.com";

    // Si pas d'ID fourni, on regarde la session (cas d'une action Admin via Dashboard)
    if (!actorId) {
        const session = await auth();
        if (session?.user) {
            actorId = session.user.id;
        } else {
            // C'est propre : undefined n'est pas une erreur, c'est une information.
            actorId = undefined; 
            actorEmail = "SYSTEM_AUTOMATION"; 
        }
    }

    // 2. Récupérer IP et UserAgent (pour la sécurité)
    const headerList = headers();
    const ip = headerList.get("x-forwarded-for") || "unknown";
    const userAgent = headerList.get("user-agent") || "unknown";

    // 3. Écriture asynchrone (on n'attend pas forcément le résultat pour ne pas ralentir l'app)
    await prisma.auditLog.create({
      data: {
        action,
        entityId,
        entityType,
        userId: actorId,
        userEmail: actorEmail,
        metadata: metadata || {},
        ipAddress: ip,
        userAgent: userAgent
      }
    });

  } catch (error) {
    // Si le log échoue, on ne veut pas faire planter toute l'application
    // On l'affiche juste dans la console serveur (ou Sentry)
    console.error("❌ Echec AuditLog:", error);
  }
}
