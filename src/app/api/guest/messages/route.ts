import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId, content, userEmail } = body;

    // Validation
    if (!listingId || !content || !userEmail) {
      return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    // Récupérer l'utilisateur (Guest)
    const guest = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!guest) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 401 });

    // Récupérer l'annonce pour trouver l'Hôte
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });

    // Empêcher de s'écrire à soi-même
    if (listing.hostId === guest.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas écrire à votre propre annonce" }, { status: 400 });
    }

    // 1. Chercher une conversation existante pour ce couple Guest/Host sur ce bien
    let conversation = await prisma.conversation.findFirst({
      where: {
        guestId: guest.id,
        listingId: listing.id
      }
    });

    // 2. Si pas de conversation, on la crée
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          guestId: guest.id,
          hostId: listing.hostId, // L'hôte du bien
          listingId: listing.id,
          lastMessageAt: new Date()
        }
      });
    } else {
      // Mise à jour de la date du dernier message
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() }
      });
    }

    // 3. Créer le message
    const newMessage = await prisma.message.create({
      data: {
        content: content,
        conversationId: conversation.id,
        senderId: guest.id
      }
    });

    return NextResponse.json(newMessage, { status: 201 });

  } catch (error) {
    console.error("Erreur Message:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }
}
