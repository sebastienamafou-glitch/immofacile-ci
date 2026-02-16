'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function sendMessage(conversationId: string, content: string) {
  // 1. SÉCURITÉ : Vérification de la session
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return { success: false, error: "Non autorisé" };
  }

  // 2. VALIDATION : Contenu vide ?
  if (!content || content.trim().length === 0) {
    return { success: false, error: "Le message ne peut pas être vide" };
  }

  try {
    // 3. RECUPERATION DE L'UTILISATEUR (Pour avoir son ID)
    const currentUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true }
    });

    if (!currentUser) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    // 4. VÉRIFICATION DES DROITS (Est-il participant ?)
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { guestId: true, hostId: true }
    });

    if (!conversation) {
      return { success: false, error: "Conversation introuvable" };
    }

    const isParticipant = 
        conversation.guestId === currentUser.id || 
        conversation.hostId === currentUser.id;

    if (!isParticipant) {
      return { success: false, error: "Accès interdit à cette conversation" };
    }

    // 5. TRANSACTION (Création Message + Mise à jour Conversation)
    // On utilise une transaction pour être sûr que tout se passe bien en même temps
    const newMessage = await prisma.$transaction(async (tx) => {
        // A. Créer le message
        const message = await tx.message.create({
            data: {
                content: content.trim(),
                conversationId: conversationId,
                senderId: currentUser.id,
                isRead: false, // Non lu par défaut
            }
        });

        // B. Mettre à jour la conversation (pour le tri "Récents")
        await tx.conversation.update({
            where: { id: conversationId },
            data: {
                lastMessageAt: new Date(),
                updatedAt: new Date()
            }
        });

        return message;
    });

    // 6. REVALIDATION DU CACHE
    // Permet à l'interface de se mettre à jour instantanément sans recharger la page
    revalidatePath(`/dashboard/guest/inbox/${conversationId}`);
    revalidatePath(`/dashboard/guest/inbox`);

    return { success: true, data: newMessage };

  } catch (error) {
    console.error("Erreur d'envoi de message:", error);
    return { success: false, error: "Erreur serveur lors de l'envoi." };
  }
}
// ✅ NOUVELLE ACTION : Pour le "Premier Contact" depuis une annonce
export async function contactHost(listingId: string, content: string) {
  // 1. SÉCURITÉ
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) return { success: false, error: "Vous devez être connecté." };
  if (!content.trim()) return { success: false, error: "Message vide." };

  try {
    const sender = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!sender) return { success: false, error: "Compte introuvable." };

    // 2. RÉCUPÉRATION DE L'ANNONCE
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return { success: false, error: "Annonce introuvable." };

    // Empêcher de s'écrire à soi-même
    if (listing.hostId === sender.id) {
        return { success: false, error: "Vous ne pouvez pas écrire à votre propre annonce." };
    }

    // 3. LOGIQUE INTELLIGENTE (Création ou Reprise)
    // On cherche si une conversation existe déjà pour ce couple Guest/Listing
    let conversation = await prisma.conversation.findFirst({
      where: {
        listingId: listing.id,
        guestId: sender.id,
        hostId: listing.hostId
      }
    });

    // Si pas de conversation, on la crée
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          guestId: sender.id,
          hostId: listing.hostId,
          listingId: listing.id,
          lastMessageAt: new Date()
        }
      });
    } else {
      // Sinon, on la "réveille" (mise à jour date)
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() }
      });
    }

    // 4. CRÉATION DU MESSAGE
    await prisma.message.create({
      data: {
        content: content,
        conversationId: conversation.id,
        senderId: sender.id,
        isRead: false
      }
    });

    // 5. REVALIDATION
    revalidatePath(`/dashboard/guest/inbox`);
    
    // On retourne l'ID pour pouvoir rediriger l'utilisateur vers la conversation
    return { success: true, conversationId: conversation.id };

  } catch (error) {
    console.error("Erreur contact hôte:", error);
    return { success: false, error: "Erreur technique lors de l'envoi." };
  }
}
