import { auth } from "@/auth"; 
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// ✅ MISE À JOUR : Ajout de PROPERTY_CREATED et PROPERTY_UPDATED
type LogAction = 
  | "KYC_VALIDATED" 
  | "KYC_REJECTED" 
  | "PAYMENT_SUCCESS" 
  | "PAYMENT_FAILED"
  | "USER_DELETED"
  | "ADMIN_LOGIN"
  | "PROPERTY_CREATED" // <--- NOUVEAU
  | "PROPERTY_UPDATED" // <--- NOUVEAU (utile pour le futur)
  | "LISTING_CREATED"
  | "LISTING_UPDATED"
  | "LISTING_DELETED"
  | "PAYMENT_INITIATED"
  | "LEASE_APPLICATION"
  | "LEASE_SIGNED"
  | "LEASE_TERMINATED"
  | "RENT_PAYMENT"
  | "MAINTENANCE_REQUEST"
  | "MAINTENANCE_RESOLVED"
  | "SIGNUP_FAILED_DUPLICATE" // ✅ AJOUT
  | "NEW_USER_REGISTERED"    // ✅ AJOUT
  | "SIGNUP_SYSTEM_ERROR"     // ✅ AJOUT
  | "KYC_VALIDATED"
  | "BOOKING_PAYMENT_SUCCESS";
  


interface LogOptions {
  action: LogAction;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, any>;
  userId?: string; 
}

export async function logActivity({ action, entityId, entityType, metadata, userId }: LogOptions) {
  try {
    let actorId = userId;
    let actorEmail = "system@immofacile.com";

    // Si pas d'ID fourni, on regarde la session
    if (!actorId) {
        const session = await auth();
        if (session?.user) {
            actorId = session.user.id;
            actorEmail = session.user.email || "no-email"; // Petit fix pour être sûr d'avoir un string
        } else {
            // Cas Système (Webhooks, Cron jobs)
            actorId = undefined; 
            actorEmail = "SYSTEM_AUTOMATION"; 
        }
    }

    const headerList = headers();
    const ip = headerList.get("x-forwarded-for") || "unknown";
    const userAgent = headerList.get("user-agent") || "unknown";

    await prisma.auditLog.create({
      data: {
        action,
        entityId,
        entityType,
        userId: actorId, // Prisma accepte undefined comme null grâce à notre fix schema
        userEmail: actorEmail,
        metadata: metadata || {},
        ipAddress: ip,
        userAgent: userAgent
      }
    });

  } catch (error) {
    console.error("❌ Echec AuditLog:", error);
  }
}
