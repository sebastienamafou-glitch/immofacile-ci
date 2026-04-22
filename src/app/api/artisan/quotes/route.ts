import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
// ✅ IMPORT DES ENUMS STRICTS
import { Role, QuoteStatus, IncidentStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

// 1. VALIDATION FINANCIÈRE STRICTE (Zod)
const quoteItemSchema = z.object({
  description: z.string().min(3, "La description de la ligne est requise"),
  quantity: z.number().int().positive("La quantité doit être supérieure à 0"),
  unitPrice: z.number().int().nonnegative("Le prix unitaire ne peut pas être négatif")
});

const quoteSchema = z.object({
  incidentId: z.string().min(1, "L'ID de l'incident est requis"),
  items: z.array(quoteItemSchema).min(1, "Un devis doit contenir au moins un élément"),
  notes: z.string().optional(),
  validityDays: z.number().int().positive().default(30)
});

export async function POST(request: Request) {
  try {
    // 2. SÉCURITÉ & VÉRIFICATION DES RÔLES
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // ✅ AJOUT : Récupération de isVerified pour le KYC
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isVerified: true }
    });

    if (!user || (user.role !== Role.ARTISAN && user.role !== Role.SUPER_ADMIN)) {
        return NextResponse.json({ error: "Seul un artisan certifié peut émettre un devis." }, { status: 403 });
    }

    // ✅ BLINDAGE KYC : L'artisan doit être vérifié
    if (!user.isVerified) {
        return NextResponse.json({ error: "Votre profil doit être vérifié (KYC) pour émettre des devis." }, { status: 403 });
    }

    // 3. NETTOYAGE ET VALIDATION DU PAYLOAD
    const body = await request.json();
    const validation = quoteSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Données de devis invalides", details: validation.error.format() }, { status: 400 });
    }

    const { incidentId, items, notes, validityDays } = validation.data; 

    // 4. CONTRÔLE D'INTÉGRITÉ MÉTIER
    const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: { 
            quote: true,
            property: { select: { ownerId: true, title: true, agencyId: true } } 
        } 
    });

    if (!incident) return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });
    if (incident.assignedToId !== userId) return NextResponse.json({ error: "Vous n'êtes pas assigné à ce chantier" }, { status: 403 });
    if (incident.quote) return NextResponse.json({ error: "Un devis a déjà été émis pour cet incident" }, { status: 400 });

    // 5. CALCULS SÉCURISÉS (Backend Only)
    let totalNet = 0;
    const formattedItems = items.map(item => {
        const lineTotal = item.quantity * item.unitPrice;
        totalNet += lineTotal;
        return {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: lineTotal
        };
    });

    const taxAmount = 0; // Explicite pour le schéma
    const totalAmount = totalNet + taxAmount;
    
    const quoteNumber = `DEV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const expirationDate = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    // 6. DÉTERMINER LA CIBLE DE LA NOTIFICATION (Propriétaire ou Agence ?)
    let targetUserId = incident.property.ownerId; // Propriétaire par défaut
    let notificationLink = `/dashboard/owner/maintenance/${incidentId}`; // Lien propriétaire par défaut

    if (incident.property.agencyId) {
        // Le bien est géré par une agence. On cherche un admin de cette agence.
        const agencyAdmin = await prisma.user.findFirst({
            where: {
                agencyId: incident.property.agencyId,
                role: Role.AGENCY_ADMIN
            },
            select: { id: true }
        });

        if (agencyAdmin) {
            targetUserId = agencyAdmin.id; // On cible l'admin de l'agence
            notificationLink = `/dashboard/agency/maintenance/${incidentId}`; // Lien vers l'espace agence
        }
    }

    // 7. EXÉCUTION ATOMIQUE (Devis + Statut + Notification)
    const result = await prisma.$transaction(async (tx) => {
        // A. Création du devis avec ENUMS
        const newQuote = await tx.quote.create({
            data: {
                number: quoteNumber,
                status: QuoteStatus.PENDING, // ✅ ENUM
                totalNet: totalNet,
                taxAmount: taxAmount,
                totalAmount: totalAmount,
                validityDate: expirationDate,
                notes: notes,
                incidentId: incidentId,
                artisanId: userId,
                items: { create: formattedItems }
            }
        });

        // B. Mise à jour de l'incident avec ENUMS
        await tx.incident.update({
            where: { id: incidentId },
            data: { status: IncidentStatus.QUOTATION } // ✅ ENUM
        });

        // C. Notification Intelligente (Agence ou Propriétaire)
        await tx.notification.create({
            data: {
                userId: targetUserId,
                title: "Nouveau Devis Reçu 📄",
                message: `L'artisan a soumis un devis de ${totalAmount.toLocaleString('fr-FR')} FCFA pour "${incident.title}".`,
                type: "INFO",
                link: notificationLink, 
                isRead: false
            }
        });

        return newQuote;
    });

    return NextResponse.json({ success: true, quote: result });

  } catch (error) {
    console.error("[API_QUOTES_POST]", error);
    return NextResponse.json({ error: "Erreur critique lors de la génération du devis." }, { status: 500 });
  }
}
