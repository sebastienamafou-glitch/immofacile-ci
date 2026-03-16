import { auth } from "@/auth"; 
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// ✅ MISE À JOUR : Nettoyage des doublons et ajout de CROWDFUNDING_SUCCESS
type LogAction = 
  | "ADMIN_LOGIN"
  | "NEW_USER_REGISTERED"
  | "USER_DELETED"
  | "SIGNUP_FAILED_DUPLICATE"
  | "SIGNUP_SYSTEM_ERROR"
  | "KYC_VALIDATED" 
  | "KYC_REJECTED" 
  | "PROPERTY_CREATED"
  | "PROPERTY_UPDATED"
  | "LISTING_CREATED"
  | "LISTING_UPDATED"
  | "LISTING_DELETED"
  | "LEASE_APPLICATION"
  | "LEASE_SIGNED"
  | "LEASE_TERMINATED"
  | "MAINTENANCE_REQUEST"
  | "MAINTENANCE_RESOLVED"
  | "PAYMENT_INITIATED"
  | "RENT_PAYMENT"
  | "PAYMENT_SUCCESS" 
  | "PAYMENT_FAILED"
  | "BOOKING_PAYMENT_SUCCESS"
  | "CROWDFUNDING_SUCCESS"; // ✅ L'AJOUT CRUCIAL POUR LE WEBHOOK
  


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
    let actorEmail = "system@babimmo.com";

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
