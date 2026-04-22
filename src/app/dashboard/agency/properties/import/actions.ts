'use server'

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PropertyType, Role } from "@prisma/client";

// ✅ VALIDATION STRICTE (Adaptée au CSV fourni)
const PropertyCSVRowSchema = z.object({
  Titre: z.string().min(2, "Titre manquant"),
  Type: z.nativeEnum(PropertyType, { error: "Type de bien invalide" }), // 🔒 CORRECTION ZOD
  Commune: z.string().min(2, "Commune manquante"),
  Adresse: z.string().min(2, "Adresse manquante"),
  Loyer: z.coerce.number().positive("Le loyer doit être positif"),
  Chambres: z.coerce.number().nonnegative(),
  SallesDeBain: z.coerce.number().nonnegative(),
  EmailProprietaire: z.string().email("Email propriétaire invalide")
});

const BatchPropertySchema = z.array(PropertyCSVRowSchema);

export async function importPropertiesAction(rawData: unknown[]) {
  const session = await auth();
  
  if (!session?.user?.id || !session.user.agencyId) {
    return { error: "Accès refusé : Vous n'êtes pas rattaché à une agence." };
  }

  const agencyId = session.user.agencyId;

  // 1. Validation du JSON extrait de l'Excel
  const validation = BatchPropertySchema.safeParse(rawData);
  if (!validation.success) {
    return { error: "Format de données invalide dans le CSV.", details: validation.error.flatten() };
  }

  const propertiesToImport = validation.data;
  let importedCount = 0;
  let missingOwnersCount = 0;

  try {
    // 2. EXÉCUTION ATOMIQUE (Si une erreur survient, RIEN n'est sauvegardé)
    await prisma.$transaction(async (tx) => {
      for (const prop of propertiesToImport) {
        
        // A. Recherche du propriétaire par son email
        const owner = await tx.user.findUnique({
          where: { email: prop.EmailProprietaire },
          select: { id: true, role: true }
        });

        // Si le propriétaire n'existe pas ou n'est pas un OWNER, on l'ignore (ou on gère l'erreur)
        if (!owner || owner.role !== Role.OWNER) {
          missingOwnersCount++;
          continue; 
        }

        // B. Création de la propriété
        await tx.property.create({
          data: {
            title: prop.Titre,
            type: prop.Type,
            commune: prop.Commune,
            address: prop.Adresse,
            price: prop.Loyer,
            bedrooms: prop.Chambres,
            bathrooms: prop.SallesDeBain,
            ownerId: owner.id,
            agencyId: agencyId,
            isPublished: true,
            isAvailable: true,
          }
        });

        importedCount++;
      }
    }, { isolationLevel: "Serializable" });

    revalidatePath('/dashboard/agency/properties');
    
    if (missingOwnersCount > 0) {
        return { 
            success: true, 
            message: `${importedCount} biens importés. Attention : ${missingOwnersCount} lignes ignorées car l'email du propriétaire est introuvable.` 
        };
    }

    return { success: true, message: `${importedCount} biens immobiliers importés avec succès !` };

  } catch (error) {
    console.error("Erreur lors de l'import des propriétés:", error);
    return { error: "Erreur technique lors de l'insertion en base." };
  }
}
