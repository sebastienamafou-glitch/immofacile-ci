'use server'

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

// ✅ VALIDATION STRICTE DES LOCATAIRES
const TenantImportSchema = z.object({
  name: z.string().min(2, "Le nom est obligatoire"),
  email: z.string().email("Email invalide").optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
}).refine(data => data.email || data.phone, {
  message: "Chaque locataire doit avoir au moins un email ou un téléphone."
});

const BatchImportSchema = z.array(TenantImportSchema);

export async function importTenantsAction(rawData: unknown[]) {
  const session = await auth();
  
  if (!session?.user?.id || !session.user.agencyId) {
    return { error: "Accès refusé : Vous n'êtes pas rattaché à une agence." };
  }

  const validation = BatchImportSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: "Format de données invalide", details: validation.error.flatten() };
  }

  const tenantsToImport = validation.data;
  let importedCount = 0;
  let skippedCount = 0;

  try {
    // ✅ TRANSACTION ATOMIQUE PRISMA
    await prisma.$transaction(async (tx) => {
      for (const tenant of tenantsToImport) {
        
        // Construction dynamique et typée pour éviter les doublons
        const orConditions: Array<{ email: string } | { phone: string }> = [];
        if (tenant.email) orConditions.push({ email: tenant.email });
        if (tenant.phone) orConditions.push({ phone: String(tenant.phone) });

        const existingUser = await tx.user.findFirst({
          where: { OR: orConditions }
        });

        if (existingUser) {
          skippedCount++;
          continue; 
        }

        await tx.user.create({
          data: {
            name: tenant.name,
            email: tenant.email || null,
            phone: tenant.phone ? String(tenant.phone) : null,
            address: tenant.address || null,
            role: Role.TENANT, 
            agencyId: session.user.agencyId,
            isVerified: false,
          }
        });

        importedCount++;
      }
    }, { isolationLevel: "Serializable" });

    revalidatePath('/dashboard/agency/tenants');
    return { 
        success: true, 
        message: `${importedCount} locataires importés. ${skippedCount > 0 ? `(${skippedCount} ignorés car déjà existants)` : ''}` 
    };

  } catch (error: unknown) {
    console.error("Erreur lors de l'import des locataires:", error);
    return { error: "Erreur technique lors de l'insertion en base." };
  }
}
