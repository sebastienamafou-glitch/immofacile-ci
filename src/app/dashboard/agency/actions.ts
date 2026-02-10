'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function signLeaseAsAgencyAction(leaseId: string) {
  const session = await auth();
  
  // SÉCURITÉ STRICTE : On vérifie que user ET agencyId existent avant de continuer
  if (!session?.user?.id || !session.user.agencyId) {
    return { error: "Accès refusé : Vous n'êtes pas rattaché à une agence." };
  }

  const agentId = session.user.id;
  const agencyId = session.user.agencyId;

  try {
    const headersList = headers();
    const ip = headersList.get("x-forwarded-for")?.split(',')[0] || "::1";
    const userAgent = headersList.get("user-agent") || "Unknown Device";

    await prisma.$transaction(async (tx) => {
        // 1. Vérification des droits d'agence
        const lease = await tx.lease.findUnique({
            where: { id: leaseId },
            include: { property: true }
        });

        if (!lease) throw new Error("Bail introuvable");
        
        // SÉCURITÉ : Le bien doit être géré par l'agence de l'agent connecté
        if (lease.property.agencyId !== agencyId) {
            throw new Error("Votre agence ne gère pas ce bien.");
        }

        if (lease.signatureStatus !== "SIGNED_TENANT") {
            throw new Error("Le locataire doit signer avant validation du mandat.");
        }

        // 2. Création de la preuve (Signataire = Agent)
        await tx.signatureProof.create({
            data: {
                leaseId: leaseId,
                signerId: agentId, // L'agent signe techniquement
                ipAddress: ip,
                userAgent: userAgent,
                documentType: "LEASE_AGREEMENT_MANDATE",
                // CORRECTION : On utilise l'ID de l'agent car sessionToken n'existe pas
                signatureData: `Mandate Signature by Agency Agent. ID: ${agentId}`
            }
        });

        // 3. Activation du bail
        await tx.lease.update({
            where: { id: leaseId },
            data: {
                signatureStatus: "COMPLETED",
                isActive: true,
                updatedAt: new Date()
            }
        });
    });

    revalidatePath(`/dashboard/agency/contracts/${leaseId}`);
    return { success: true };

  } catch (error: any) {
    console.error("Erreur signature agence:", error);
    return { error: error.message || "Erreur technique." };
  }
}
