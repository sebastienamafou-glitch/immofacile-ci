'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function signLeaseAsOwnerAction(leaseId: string) {
  const session = await auth();

  // Correction TypeScript : Vérification stricte
  if (!session?.user?.id) return { error: "Non autorisé" };

  // Variable sûre pour TypeScript
  const ownerId = session.user.id;
  const ownerEmail = session.user.email || "Email inconnu";

  try {
    // 1. CAPTURE AUDIT
    const headersList = headers();
    const ip = headersList.get("x-forwarded-for")?.split(',')[0] || "::1 (Localhost)";
    const userAgent = headersList.get("user-agent") || "Unknown Device";

    // 2. TRANSACTION
    await prisma.$transaction(async (tx) => {
        
        const lease = await tx.lease.findUnique({
            where: { id: leaseId },
            include: { property: true }
        });

        if (!lease) throw new Error("Bail introuvable");
        
        // Utilisation de ownerId (sûr) au lieu de session.user.id (incertain)
        if (lease.property.ownerId !== ownerId) throw new Error("Ce bien ne vous appartient pas.");

        if (lease.signatureStatus !== "SIGNED_TENANT") {
            throw new Error("Le locataire doit signer avant vous.");
        }

        // B. Preuve de Signature
        await tx.signatureProof.create({
            data: {
                leaseId: leaseId,
                signerId: ownerId, // ✅ ID Sûr
                ipAddress: ip,
                userAgent: userAgent,
                documentType: "LEASE_AGREEMENT",
                signedAt: new Date(),
                // ✅ Correction : Suppression de sessionToken qui causait l'erreur
                signatureData: `Validated by Owner (${ownerEmail}). IP: ${ip}`
            }
        });

        // C. Activation
        await tx.lease.update({
            where: { id: leaseId },
            data: {
                signatureStatus: "COMPLETED",
                isActive: true,
                updatedAt: new Date()
            }
        });
    });

    revalidatePath(`/dashboard/owner/leases/${leaseId}`);
    return { success: true };

  } catch (error: any) {
    console.error("Erreur signature propriétaire:", error);
    return { error: error.message || "Erreur technique." };
  }
}
