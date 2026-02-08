// src/lib/logger.ts
import { prisma } from "@/lib/prisma";

export async function logActivity(
  action: string,
  category: "AUTH" | "FINANCE" | "SECURITY" | "SYSTEM",
  details: any,
  userId?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        category,
        details,
        userId: userId || null, // Peut être null si l'utilisateur n'est pas encore connecté
      },
    });
  } catch (error) {
    console.error("❌ Échec de l'enregistrement du log d'audit:", error);
    // On ne bloque pas l'application si le log échoue
  }
}
