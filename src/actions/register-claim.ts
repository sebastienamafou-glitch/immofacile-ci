"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt";

export async function registerAndClaim(data: {
  name: string;
  phone: string;
  password: string;
  propertyId: string;
}) {
  try {
    // 1. Vérification de la propriété
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
      select: { isClaimed: true }
    });

    if (!property) return { success: false, error: "Propriété introuvable." };
    if (property.isClaimed) return { success: false, error: "Ce bien a déjà été revendiqué." };

    // 2. Vérification si le numéro de téléphone existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { phone: data.phone }
    });

    if (existingUser) {
      return { success: false, error: "Ce numéro est déjà utilisé. Veuillez vous connecter." };
    }

    // 3. Hachage du mot de passe
    const hashedPassword = await hash(data.password, 10);

    // 4. Transaction Atomique : Création du compte + Transfert du bien
    await prisma.$transaction(async (tx) => {
      // Création de l'Ambassadeur
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          phone: data.phone,
          password: hashedPassword,
          role: "AMBASSADOR", // 🎯 Le fameux rôle
          isVerified: false,  // Il devra passer le KYC plus tard pour être "Certifié"
          finance: {
            create: { walletBalance: 0 }
          }
        }
      });

      // Transfert du bien à l'Ambassadeur
      await tx.property.update({
        where: { id: data.propertyId },
        data: {
          ownerId: newUser.id, // L'Ambassadeur devient le gestionnaire principal du bien sur la plateforme
          isClaimed: true,
        }
      });
    });

    return { success: true };

  } catch (error) {
    console.error("Erreur Register & Claim:", error);
    return { success: false, error: "Une erreur est survenue lors de la création du compte." };
  }
}
