'use server'

import { prisma } from '@/lib/prisma';
import { PropertyType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Interface basée sur ton script, mais adaptée pour le réseau
export interface PropertyImportPayload {
  title: string;
  description: string;
  address: string;
  commune: string;
  price: number;
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  ownerId: string;
  agencyId: string;
}

export async function importPropertiesAction(propertiesToImport: PropertyImportPayload[]) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Pour des performances optimales, on utilise createMany plutôt qu'une boucle `for`
      const importResult = await tx.property.createMany({
        data: propertiesToImport.map(property => ({
          title: property.title,
          description: property.description,
          address: property.address,
          commune: property.commune,
          price: property.price,
          type: property.type,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          ownerId: property.ownerId,
          agencyId: property.agencyId,
          isPublished: true, // [cite: 46]
          isAvailable: true, // [cite: 46]
          source: 'MANUAL', // [cite: 47, 131, 132]
        })),
        skipDuplicates: true, // Empêche le crash si un bien existe déjà
      });

      return importResult.count;
    });

    // On dit à Next.js de rafraîchir la page du dashboard pour afficher les nouveaux biens
    revalidatePath('/dashboard/properties');

    return { success: true, count: result, message: `${result} biens ont été importés.` };
  } catch (error) {
    console.error("Erreur lors de l'import massif :", error);
    return { success: false, message: "Échec de l'importation. Veuillez vérifier le format de vos données." };
  }
}
