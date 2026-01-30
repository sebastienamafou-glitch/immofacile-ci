import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { quoteId, action } = await req.json();

    if (!quoteId || !['ACCEPT', 'REJECT'].includes(action)) {
        return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // 1. Récupérer le devis ET l'incident (pour avoir le titre et l'artisan)
    const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: { 
            incident: { select: { id: true, title: true, property: { select: { ownerId: true } } } },
            artisan: { select: { id: true } } // On a besoin de l'ID de l'artisan pour le notifier
        }
    });

    if (!quote || quote.incident.property.ownerId !== userId) {
        return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    // 2. Mise à jour du Devis
    const updatedQuote = await prisma.quote.update({
        where: { id: quoteId },
        data: { status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' }
    });

    // 3. Logique Métier + NOTIFICATIONS
    if (action === 'ACCEPT') {
        // A. Mise à jour Incident
        await prisma.incident.update({
            where: { id: quote.incidentId },
            data: { 
                status: 'IN_PROGRESS',
                quoteAmount: quote.totalAmount
            }
        });

        // B. ✅ NOTIFICATION SUCCÈS POUR L'ARTISAN
        await prisma.notification.create({
            data: {
                userId: quote.artisanId,
                title: "Devis Validé ! 🚀",
                message: `Bonne nouvelle ! Le devis pour "${quote.incident.title}" a été accepté. Vous pouvez commencer les travaux.`,
                type: "SUCCESS",
                link: `/dashboard/artisan/incidents/${quote.incidentId}`
            }
        });

    } else {
        // C. ✅ NOTIFICATION REFUS POUR L'ARTISAN
        await prisma.notification.create({
            data: {
                userId: quote.artisanId,
                title: "Devis Refusé ❌",
                message: `Le propriétaire a décliné votre proposition pour "${quote.incident.title}".`,
                type: "ERROR",
                link: `/dashboard/artisan/incidents/${quote.incidentId}`
            }
        });
    }

    return NextResponse.json({ success: true, quote: updatedQuote });

  } catch (error) {
    console.error("Erreur réponse devis:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
