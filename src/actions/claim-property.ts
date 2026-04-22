"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client"; // 👈 AJOUT

export async function claimScrapedProperty(propertyId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Vous devez être connecté pour revendiquer un bien." };
    }

    // 1. Vérification de la propriété
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { isClaimed: true, ownerId: true }
    });

    if (!property) return { success: false, error: "Propriété introuvable." };
    if (property.isClaimed) return { success: false, error: "Ce bien a déjà été revendiqué." };

    // 2. Transfert de propriété & Mise à jour du rôle utilisateur
    await prisma.$transaction(async (tx) => {
      // On transfère le bien
      await tx.property.update({
        where: { id: propertyId },
        data: {
          ownerId: userId,
          isClaimed: true, // Le piège se referme, le bien lui appartient
        }
      });

      // On s'assure que l'utilisateur a le rôle Propriétaire
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user && user.role === Role.UNASSIGNED) { // 🔒 CORRECTION : Utilise l'Enum valide
        await tx.user.update({
          where: { id: userId },
          data: { role: Role.OWNER }
        });
      }
    });

    revalidatePath(`/properties/${propertyId}`);
    return { success: true };

  } catch (error) {
    console.error("Erreur Claim Property:", error);
    return { success: false, error: "Une erreur est survenue lors de la revendication." };
  }
}
