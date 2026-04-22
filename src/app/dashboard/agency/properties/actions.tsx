'use server'

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PropertyType } from "@prisma/client";

export interface ActionState {
  error?: string;
  issues?: Record<string, string[]>;
}

const PropertySchema = z.object({
  title: z.string().min(5, "Le titre doit faire au moins 5 caractères"),
  description: z.string().optional(),
  price: z.coerce.number().int("Le prix doit être un entier").positive("Le prix doit être positif"),
  surface: z.coerce.number().positive().optional(), 
  bedrooms: z.coerce.number().int("Doit être un entier").min(0),
  bathrooms: z.coerce.number().int("Doit être un entier").min(0),
  address: z.string().min(5),
  commune: z.string().min(2),
  type: z.nativeEnum(PropertyType),
  isAvailable: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  images: z.array(z.string().url("URL d'image invalide")).default([]), 
});

// ============================================================================
// 🎯 ACTION 1 : CRÉATION D'UN BIEN
// ============================================================================
export async function createPropertyAction(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { agencyId: true }
  });

  if (!user?.agencyId) return { error: "Vous devez être rattaché à une agence." };

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description") ? String(formData.get("description")) : undefined,
    price: formData.get("price"),
    surface: formData.get("surface") ? formData.get("surface") : undefined,
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    address: formData.get("address"),
    commune: formData.get("commune"),
    type: String(formData.get("type")).toUpperCase(),
    isPublished: formData.get("isPublished") === "on", 
    images: formData.getAll("images").map(String).filter(img => img.trim() !== ""), 
  };
  const validatedFields = PropertySchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.log("🚨 ERREURS ZOD :", validatedFields.error.flatten().fieldErrors);
    return { error: "Données invalides", issues: validatedFields.error.flatten().fieldErrors };
  }

  let newPropertyId = "";

  try {
    const newProperty = await prisma.property.create({
      data: {
        ...validatedFields.data,
        isAvailable: true,
        ownerId: session.user.id,
        agentId: session.user.id, 
        agencyId: user.agencyId,  
      }
    });

    newPropertyId = newProperty.id;

    await logActivity({
      action: "PROPERTY_CREATED",
      entityId: newProperty.id,
      entityType: "PROPERTY",
      userId: session.user.id,
      metadata: { source: "Agency Dashboard", price: newProperty.price, isPublished: validatedFields.data.isPublished }
    });

  } catch (error: unknown) {
    console.error("Create Error:", error);
    return { error: "Erreur serveur lors de la création." };
  }
  
  revalidatePath('/dashboard/agency/properties');
  redirect(`/dashboard/agency/properties/${newPropertyId}`);
}

// ============================================================================
// 🎯 ACTION 2 : MISE À JOUR D'UN BIEN
// ============================================================================
export async function updatePropertyAction(
  propertyId: string, 
  prevState: ActionState | null, 
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { agencyId: true }
  });

  if (!user?.agencyId) return { error: "Agence non identifiée" };

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description") ? String(formData.get("description")) : undefined,
    price: formData.get("price"),
    surface: formData.get("surface") ? formData.get("surface") : undefined,
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    address: formData.get("address"),
    commune: formData.get("commune"),
    type: String(formData.get("type")).toUpperCase(),
    isAvailable: formData.get("isAvailable") === "on",
    isPublished: formData.get("isPublished") === "on", 
    images: formData.getAll("images").map(String).filter(img => img.trim() !== ""),
  };

  const validatedFields = PropertySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: "Données invalides", issues: validatedFields.error.flatten().fieldErrors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingProperty = await tx.property.findFirst({
        where: { id: propertyId, agencyId: user.agencyId }
      });

      if (!existingProperty) {
        throw new Error("UNAUTHORIZED_OR_NOT_FOUND");
      }

      const updatedProperty = await tx.property.update({
        where: { id: propertyId },
        data: { ...validatedFields.data }
      });

      await logActivity({
        action: "PROPERTY_UPDATED",
        entityId: propertyId,
        entityType: "PROPERTY",
        userId: session.user.id,
        metadata: {
          previousPrice: existingProperty.price,
          newPrice: updatedProperty.price,
          changes: "Metadata and images updated"
        }
      });
    });

  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED_OR_NOT_FOUND") {
        return { error: "Bien introuvable ou accès refusé" };
    }
    console.error("Update Error:", error);
    return { error: "Erreur serveur lors de la mise à jour." };
  }
  
  revalidatePath(`/dashboard/agency/properties/${propertyId}`);
  redirect(`/dashboard/agency/properties/${propertyId}`);
}
