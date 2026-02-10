'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function signContractAction(leaseId: string) {
  // 1. SÉCURITÉ : Vérifier la session
  const session = await auth();
  
  // Correction TypeScript : On s'assure ici que l'ID existe
  if (!session?.user?.id) {
    return { error: "Vous devez être connecté pour signer." };
  }
  
  // On stocke l'ID dans une constante sûre pour l'utiliser dans la transaction
  const userId = session.user.id;
  const userEmail = session.user.email || "Email inconnu";

  try {
    // 2. CAPTURE DES DONNÉES D'AUDIT
    const headersList = headers();
    const ip = headersList.get("x-forwarded-for")?.split(',')[0] || "::1 (Localhost)";
    const userAgent = headersList.get("user-agent") || "Unknown Device";

    // 3. TRANSACTION ATOMIQUE
    await prisma.$transaction(async (tx) => {
      
      const lease = await tx.lease.findUnique({
        where: { id: leaseId },
      });

      if (!lease) throw new Error("Contrat introuvable.");
      if (lease.tenantId !== userId) throw new Error("Ce contrat ne vous concerne pas.");
      if (lease.signatureStatus !== "PENDING") throw new Error("Ce contrat est déjà traité.");

      // B. Création de la Preuve (Sans sessionToken qui n'existe pas)
      await tx.signatureProof.create({
        data: {
          leaseId: leaseId,
          signerId: userId, // ✅ Utilisation de la variable sûre
          ipAddress: ip,
          userAgent: userAgent,
          documentType: "LEASE_AGREEMENT",
          signedAt: new Date(),
          // On remplace sessionToken par l'email pour la tracabilité
          signatureData: `Signed electronically by Tenant (${userEmail}). IP: ${ip}`
        }
      });

      // C. Mise à jour du statut
      await tx.lease.update({
        where: { id: leaseId },
        data: {
          signatureStatus: "SIGNED_TENANT",
          updatedAt: new Date(),
        }
      });
    });

    revalidatePath(`/dashboard/tenant/contracts/${leaseId}`);
    return { success: true };

  } catch (error: any) {
    console.error("Erreur signature:", error);
    return { error: error.message || "Erreur technique." };
  }
}
