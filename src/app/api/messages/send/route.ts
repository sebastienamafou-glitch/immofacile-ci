import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Auth & Validation
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { conversationId, content } = body;

    if (!conversationId || !content) {
      return NextResponse.json({ error: "Contenu manquant" }, { status: 400 });
    }

    // 2. Identifier l'utilisateur
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 404 });

    // 3. SÉCURITÉ : Vérifier l'appartenance à la conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { guest: true, host: true }
    });

    if (!conversation) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });

    // On vérifie que l'utilisateur est soit le Guest, soit l'Host
    const isParticipant = conversation.guestId === user.id || conversation.hostId === user.id;

    if (!isParticipant) {
      return NextResponse.json({ error: "Vous ne participez pas à cette discussion." }, { status: 403 });
    }

    // 4. Création du Message
    const newMessage = await prisma.message.create({
      data: {
        content,
        conversationId,
        senderId: user.id,
        isRead: false
      }
    });

    // 5. Mettre à jour la date de dernière activité de la conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    });

    return NextResponse.json({ success: true, message: newMessage });

  } catch (error) {
    console.error("Erreur Envoi Message:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
