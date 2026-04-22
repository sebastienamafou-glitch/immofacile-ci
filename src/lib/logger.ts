import { auth } from "@/auth"; 
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { AuditAction, Prisma } from "@prisma/client";

interface LogOptions {
  action: AuditAction; // 🔒 Utilisation directe de l'Enum officiel
  entityId?: string;
  entityType?: string;
  metadata?: Prisma.InputJsonObject;
  userId?: string; 
}

export async function logActivity({ action, entityId, entityType, metadata, userId }: LogOptions) {
  try {
    let actorId = userId;
    let actorEmail = "system@babimmo.com";

    if (!actorId) {
        const session = await auth();
        if (session?.user) {
            actorId = session.user.id;
            actorEmail = session.user.email || "no-email"; 
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
        userId: actorId, 
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
