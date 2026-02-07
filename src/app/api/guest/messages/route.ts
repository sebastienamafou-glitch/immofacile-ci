import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 🔒 SÉCURITÉ : Identité via Middleware
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { listingId, content } = body; // On ignore 'userEmail' du body

    if (!listingId || !content) {
      return NextResponse.json({ error: "Message vide ou annonce manquante" }, { status: 400 });
    }

    // Récupérer l'utilisateur authentifié
    const sender = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!sender) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    // Récupérer l'annonce et l'hôte
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });

    // Empêcher de s'écrire à soi-même
    if (listing.hostId === sender.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas contacter votre propre annonce." }, { status: 400 });
    }

    // 1. Chercher conversation existante (Guest <-> Host pour ce listing)
    let conversation = await prisma.conversation.findFirst({
      where: {
        listingId: listing.id,
        guestId: sender.id, // L'expéditeur est le Guest ici
        hostId: listing.hostId
      }
    });

    // 2. Création ou Mise à jour
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
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() }
      });
    }

    // 3. Envoi du message
    const newMessage = await prisma.message.create({
      data: {
        content: content,
        conversationId: conversation.id,
        senderId: sender.id,
        isRead: false
      }
    });

    return NextResponse.json(newMessage, { status: 201 });

  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
