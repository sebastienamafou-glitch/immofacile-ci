'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleWishlist(listingId: string) {
  // 1. SÉCURITÉ
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) return { success: false, error: "Non connecté" };

  try {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return { success: false, error: "Compte introuvable" };

    // 2. VÉRIFICATION : Est-ce déjà en favori ?
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_listingId: {
          userId: user.id,
          listingId: listingId
        }
      }
    });

    // 3. ACTION (Ajout ou Suppression)
    if (existing) {
      await prisma.wishlist.delete({
        where: { id: existing.id }
      });
      
      // On rafraîchit les pages concernées
      revalidatePath("/dashboard/guest/favorites");
      revalidatePath(`/akwaba/${listingId}`);
      
      return { success: true, action: "removed", message: "Retiré des favoris" };
    } else {
      await prisma.wishlist.create({
        data: {
          userId: user.id,
          listingId: listingId
        }
      });

      revalidatePath("/dashboard/guest/favorites");
      revalidatePath(`/akwaba/${listingId}`);

      return { success: true, action: "added", message: "Ajouté aux favoris" };
    }

  } catch (error) {
    console.error("Erreur Wishlist:", error);
    return { success: false, error: "Erreur serveur" };
  }
}
