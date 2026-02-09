'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ==========================================
// 1. EXPORT DES DONNÉES (Droit à la portabilité)
// ==========================================
export async function exportUserData() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  try {
    // On récupère TOUTES les données liées à l'utilisateur
    const fullUserData = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        finance: true,
        kyc: true,
        propertiesOwned: true,
        leases: true,
        transactions: true,
        //payments: true, // Si relation directe existe
        bookings: true,
        listings: true,
        incidentsReported: true
      }
    });

    if (!fullUserData) return { error: "Utilisateur introuvable" };

    // On nettoie les champs sensibles (Mot de passe, etc.)
    const { password, ...safeData } = fullUserData;

    // On renvoie un JSON stringifié
    return { success: true, data: JSON.stringify(safeData, null, 2) };

  } catch (error) {
    console.error("Erreur Export RGPD:", error);
    return { error: "Erreur lors de la génération de l'export." };
  }
}

// ==========================================
// 2. SUPPRESSION DE COMPTE (Droit à l'oubli)
// ==========================================
export async function deleteUserAccount() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  const userId = session.user.id;

  try {
    // SOFT DELETE : On anonymise au lieu de supprimer
    // Cela permet de garder l'historique des transactions (Loi comptable)
    // tout en rendant l'utilisateur impossible à identifier.
    
    await prisma.$transaction(async (tx) => {
        // 1. Vérifier s'il reste de l'argent dans le Wallet
        const userFinance = await tx.userFinance.findUnique({ where: { userId } });
        if (userFinance && userFinance.walletBalance > 0) {
            throw new Error("Veuillez retirer vos fonds avant de supprimer votre compte.");
        }

        // 2. Anonymisation (Pour respecter les contraintes @unique du schema)
        const timestamp = Date.now();
        await tx.user.update({
            where: { id: userId },
            data: {
                name: "Utilisateur Supprimé",
                email: `deleted_${userId}_${timestamp}@immofacile.deleted`, // Contourne l'unicité
                phone: `del_${userId}_${timestamp}`, // Contourne l'unicité
                image: null,
                password: null, // Empêche toute connexion future
                isActive: false, // Marqueur officiel de suppression
                address: null,
                bio: null,
                jobTitle: null,
                isAvailable: false,
                notifEmail: false,
                notifSms: false,
                // On garde l'ID pour les relations Transaction/AuditLog
            }
        });

        // 3. Optionnel : Désactiver ses annonces s'il est propriétaire
        await tx.listing.updateMany({
            where: { hostId: userId },
            data: { isPublished: false }
        });
        
        await tx.property.updateMany({
            where: { ownerId: userId },
            data: { isPublished: false }
        });
    });

    return { success: true };

  } catch (error: any) {
    console.error("Erreur Suppression RGPD:", error);
    return { error: error.message || "Impossible de supprimer le compte." };
  }
}
