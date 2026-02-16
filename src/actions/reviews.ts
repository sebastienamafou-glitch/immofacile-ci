'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createReview(listingId: string, rating: number, comment: string) {
  // 1. SÉCURITÉ
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) return { success: false, error: "Non autorisé" };
  if (rating < 1 || rating > 5) return { success: false, error: "Note invalide." };

  try {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return { success: false, error: "Utilisateur introuvable" };

    // 2. VÉRIFICATION D'ÉLIGIBILITÉ
    // L'utilisateur a-t-il une réservation TERMINÉE pour ce logement ?
    const completedBooking = await prisma.booking.findFirst({
      where: {
        listingId: listingId,
        guestId: user.id,
        status: "COMPLETED" // ✅ Seuls les séjours terminés peuvent être notés
      }
    });

    if (!completedBooking) {
      return { success: false, error: "Vous ne pouvez noter que les logements où vous avez séjourné." };
    }

    // 3. ANTI-SPAM (Une seule note par séjour ou par logement ?)
    // Ici, on vérifie s'il a déjà noté ce logement
    const existingReview = await prisma.review.findFirst({
        where: {
            authorId: user.id,
            listingId: listingId
        }
    });

    if (existingReview) {
        return { success: false, error: "Vous avez déjà noté ce logement." };
    }

    // 4. CRÉATION DE L'AVIS
    await prisma.review.create({
      data: {
        rating,
        comment,
        listingId,
        authorId: user.id
      }
    });

    // 5. REVALIDATION
    revalidatePath("/dashboard/guest/history");
    revalidatePath(`/akwaba/${listingId}`); // Met à jour la page publique aussi

    return { success: true };

  } catch (error) {
    console.error("Erreur avis:", error);
    return { success: false, error: "Erreur serveur." };
  }
}
