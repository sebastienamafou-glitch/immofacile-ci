'use server'

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PropertyType } from "@prisma/client";

// Schéma de validation Zod (Strict)
const PropertySchema = z.object({
  title: z.string().min(5, "Le titre doit faire au moins 5 caractères"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Le prix doit être positif"),
  surface: z.coerce.number().positive().optional(),
  bedrooms: z.coerce.number().min(0),
  bathrooms: z.coerce.number().min(0),
  address: z.string().min(5),
  commune: z.string().min(2),
  type: z.nativeEnum(PropertyType),
  isAvailable: z.boolean().default(true),
});

export async function updatePropertyAction(propertyId: string, prevState: any, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  // 1. Validation des droits et de l'agence
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { agencyId: true }
  });

  if (!user?.agencyId) return { error: "Agence non identifiée" };

  // 2. Vérification de l'appartenance du bien (Isolation)
  const existingProperty = await prisma.property.findFirst({
    where: { id: propertyId, agencyId: user.agencyId }
  });

  if (!existingProperty) return { error: "Bien introuvable ou accès refusé" };

  // 3. Parsing des données
  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    surface: formData.get("surface"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    address: formData.get("address"),
    commune: formData.get("commune"),
    type: formData.get("type"),
    isAvailable: formData.get("isAvailable") === "on",
  };

  const validatedFields = PropertySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: "Données invalides", issues: validatedFields.error.flatten() };
  }

  try {
    // 4. Update Database
    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        ...validatedFields.data,
        // On ne touche pas aux images ici pour l'instant (module séparé)
      }
    });

    // 5. AUDIT LOG (CRITIQUE)
    await logActivity({
      action: "PROPERTY_UPDATED",
      entityId: propertyId,
      entityType: "PROPERTY",
      userId: session.user.id,
      metadata: {
        previousPrice: existingProperty.price,
        newPrice: updatedProperty.price,
        changes: "Metadata update via Edit Form"
      }
    });

    // 6. Refresh Cache & Redirect
    revalidatePath(`/dashboard/agency/properties/${propertyId}`);
    
  } catch (error) {
    console.error("Update Error:", error);
    return { error: "Erreur serveur lors de la mise à jour." };
  }
  
  // Le redirect doit être hors du try/catch dans les Server Actions
  redirect(`/dashboard/agency/properties/${propertyId}`);
}
