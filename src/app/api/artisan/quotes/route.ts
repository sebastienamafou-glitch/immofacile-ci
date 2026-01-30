import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { incidentId, items, notes, validityDays } = body; 

    if (!incidentId || !items || items.length === 0) {
        return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    // 2. VÉRIFICATION
    const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: { 
            quote: true,
            property: { select: { ownerId: true, title: true } } 
        } 
    });

    if (!incident) return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });
    if (incident.assignedToId !== userId) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    if (incident.quote) return NextResponse.json({ error: "Un devis existe déjà" }, { status: 400 });

    // 3. CALCULS
    let totalNet = 0;
    const formattedItems = items.map((item: any) => {
        const lineTotal = item.quantity * item.unitPrice;
        totalNet += lineTotal;
        return {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: lineTotal
        };
    });

    const quoteNumber = `DEV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    // 4. TRANSACTION (Devis + Notif)
    const result = await prisma.$transaction(async (tx) => {
        // A. Créer le devis
        const newQuote = await tx.quote.create({
            data: {
                number: quoteNumber,
                status: 'PENDING',
                totalNet: totalNet,
                totalAmount: totalNet,
                validityDate: new Date(Date.now() + (validityDays || 30) * 24 * 60 * 60 * 1000),
                notes: notes,
                incidentId: incidentId,
                artisanId: userId,
                items: { create: formattedItems }
            }
        });

        // B. Update Incident
        await tx.incident.update({
            where: { id: incidentId },
            data: { status: 'QUOTATION' } 
        });

        // C. 🔔 NOTIFICATION (C'EST ICI QUE SE TROUVE LE LIEN)
        await tx.notification.create({
            data: {
                userId: incident.property.ownerId,
                title: "Nouveau Devis Reçu 📄",
                message: `L'artisan a envoyé un devis de ${totalNet} FCFA pour "${incident.title}".`,
                type: "INFO",
                
                // ✅ LE LIEN CORRIGÉ VERS LE DOSSIER MAINTENANCE
                link: `/dashboard/owner/maintenance/incidents/${incidentId}`, 
                
                isRead: false
            }
        });

        return newQuote;
    });

    return NextResponse.json({ success: true, quote: result });

  } catch (error) {
    console.error("Erreur Devis:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
