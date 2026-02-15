import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. AUTHENTIFICATION ZERO TRUST
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const userId = session.user.id;

    const body = await request.json();
    const { listingId, startDate, endDate, reason } = body;

    // 2. VALIDATION ENTRÉES
    if (!listingId || !startDate || !endDate) {
        return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // On normalise les dates (début de journée) pour éviter les bugs d'heures
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    if (start >= end) {
        return NextResponse.json({ error: "La date de fin doit être après le début." }, { status: 400 });
    }

    // 3. VÉRIFICATION DE PROPRIÉTÉ
    const listing = await prisma.listing.findFirst({
        where: { 
            id: listingId,
            hostId: userId 
        }
    });

    if (!listing) {
        return NextResponse.json({ error: "Logement introuvable ou accès refusé." }, { status: 403 });
    }

    // 4. VÉRIFICATION DE CHEVAUCHEMENT (CORRIGÉE)
    // La logique exacte est : (StartA < EndB) ET (EndA > StartB)
    const overlap = await prisma.booking.findFirst({
        where: {
            listingId: listingId,
            // On inclut CHECKED_IN et COMPLETED pour ne pas écraser l'historique ou le présent
            status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN', 'COMPLETED'] },
            AND: [
                { startDate: { lt: end } },
                { endDate: { gt: start } }
            ]
        }
    });

    if (overlap) {
        return NextResponse.json({ error: "Ces dates sont déjà réservées par un client." }, { status: 409 });
    }

    // 5. CRÉATION DU BLOCAGE
    await prisma.booking.create({
        data: {
            startDate: start,
            endDate: end,
            totalPrice: 0,
            status: "CONFIRMED", // Considéré comme occupé
            guestId: userId,     // Le propriétaire se réserve à lui-même
            listingId: listingId,
            guestCount: 1,       // ✅ Obligatoire pour le schema
            // On pourrait utiliser un champ 'notes' ou 'internalNote' si dispo, sinon on perd la raison
        }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur Block Dates:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
