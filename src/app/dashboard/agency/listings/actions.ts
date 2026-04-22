'use server'

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger"; // Notre système d'audit
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuditAction } from "@prisma/client";
// --- 1. SCHÉMA DE VALIDATION (Zod) ---
const ListingSchema = z.object({
  title: z.string().min(5, "Le titre est trop court (min 5 chars)"),
  description: z.string().min(20, "Description trop courte"),
  pricePerNight: z.coerce.number().positive("Le prix doit être positif"),
  
  // Localisation
  address: z.string().min(5),
  city: z.string().min(2),
  neighborhood: z.string().optional(),
  
  // Capacité
  bedrooms: z.coerce.number().min(1),
  bathrooms: z.coerce.number().min(1),
  maxGuests: z.coerce.number().min(1),
  
  // Médias & Config
  images: z.array(z.string()).min(1, "Au moins une photo est requise"),
  hostId: z.string().min(1, "Un hôte doit être assigné"),
  isPublished: z.boolean().optional(),
});

// --- 2. ACTION : CRÉER UNE ANNONCE ---
export async function createListingAction(prevState: any, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  // Vérification Agence
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { agencyId: true }
  });

  if (!user?.agencyId) return { error: "Accès refusé : Aucune agence liée." };

  // Parsing des données
  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    pricePerNight: formData.get("pricePerNight"),
    address: formData.get("address"),
    city: formData.get("city"),
    neighborhood: formData.get("neighborhood"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    maxGuests: formData.get("maxGuests"),
    hostId: formData.get("hostId"),
    images: formData.getAll("images"), // Récupère toutes les images
    isPublished: formData.get("isPublished") === "on",
  };

  const validated = ListingSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: "Données invalides", issues: validated.error.flatten() };
  }

  try {
    // CRÉATION DB
    const newListing = await prisma.listing.create({
      data: {
        ...validated.data,
        amenities: {}, // À gérer plus tard si besoin
        agencyId: user.agencyId, // 🔒 Verrouillage Agence
      }
    });

    // 🔒 AUDIT LOG (CRITIQUE)
    await logActivity({
      action: AuditAction.LISTING_CREATED,
      entityId: newListing.id,
      entityType: "LISTING",
      userId: session.user.id,
      metadata: {
        title: newListing.title,
        price: newListing.pricePerNight,
        agencyId: user.agencyId
      }
    });

  } catch (error) {
    console.error("Create Listing Error:", error);
    return { error: "Erreur serveur lors de la création." };
  }

  revalidatePath("/dashboard/agency/listings");
  redirect("/dashboard/agency/listings");
}

// --- 3. ACTION : MODIFIER UNE ANNONCE ---
export async function updateListingAction(listingId: string, prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };
  
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true }
    });
  
    if (!user?.agencyId) return { error: "Agence introuvable" };
  
    // VERIFICATION PROPRIÉTÉ (Isolation)
    const existingListing = await prisma.listing.findFirst({
        where: { id: listingId, agencyId: user.agencyId }
    });

    if (!existingListing) return { error: "Annonce introuvable ou accès refusé" };

    // Parsing (similaire à create, on peut réutiliser le schéma)
    const rawData = {
        title: formData.get("title"),
        description: formData.get("description"),
        pricePerNight: formData.get("pricePerNight"),
        address: formData.get("address"),
        city: formData.get("city"),
        neighborhood: formData.get("neighborhood"),
        bedrooms: formData.get("bedrooms"),
        bathrooms: formData.get("bathrooms"),
        maxGuests: formData.get("maxGuests"),
        hostId: formData.get("hostId"),
        images: formData.getAll("images").map(String).filter(url => url.startsWith("http")),
        isPublished: formData.get("isPublished") === "on",
        
    };

    const validated = ListingSchema.safeParse(rawData);
    if (!validated.success) {
        return { error: "Validation échouée", issues: validated.error.flatten() };
    }

    try {
        await prisma.listing.update({
            where: { id: listingId },
            data: validated.data
        });

        // 🔒 AUDIT LOG
        await logActivity({
            action: AuditAction.LISTING_UPDATED,
            entityId: listingId,
            entityType: "LISTING",
            userId: session.user.id,
            metadata: {
                previousPrice: existingListing.pricePerNight,
                newPrice: validated.data.pricePerNight,
                changes: "Update via Form"
            }
        });

    } catch (error) {
        return { error: "Erreur lors de la mise à jour" };
    }

    revalidatePath(`/dashboard/agency/listings/${listingId}`);
    redirect(`/dashboard/agency/listings/${listingId}`);
}
