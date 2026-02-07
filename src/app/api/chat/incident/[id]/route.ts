import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// 1. GET : Récupérer les messages d'un incident
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const incidentId = params.id;

    // On cherche la conversation liée à cet incident
    let conversation = await prisma.conversation.findUnique({
      where: { incidentId },
      include: { 
        messages: {
            orderBy: { createdAt: 'asc' },
            include: { sender: { select: { id: true, name: true, role: true } } }
        }
      }
    });

    // Si pas de conversation, on renvoie un tableau vide (elle sera créée au premier message)
    if (!conversation) {
        return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({ messages: conversation.messages });

  } catch (error) {
    return NextResponse.json({ error: "Erreur chargement chat" }, { status: 500 });
  }
}

// 2. POST : Envoyer un message
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const incidentId = params.id;
    const { content } = await request.json();

    if (!content) return NextResponse.json({ error: "Message vide" }, { status: 400 });

    // Transaction : Créer/Trouver la conversation + Ajouter le message
    const newMessage = await prisma.$transaction(async (tx) => {
        // A. Trouver ou Créer la conversation
        let conv = await tx.conversation.findUnique({ where: { incidentId } });
        
        if (!conv) {
            // On doit récupérer les participants depuis l'incident pour les logs (optionnel ici, on simplifie)
            conv = await tx.conversation.create({
                data: { incidentId }
            });
        }

        // B. Créer le message
        const msg = await tx.message.create({
            data: {
                content,
                conversationId: conv.id,
                senderId: userId
            },
            include: { sender: { select: { id: true, name: true } } }
        });

        // C. Mettre à jour la date de dernière activité
        await tx.conversation.update({
            where: { id: conv.id },
            data: { lastMessageAt: new Date() }
        });

        return msg;
    });

    return NextResponse.json({ success: true, message: newMessage });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur envoi" }, { status: 500 });
  }
}
