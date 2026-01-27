import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. AUTHENTIFICATION ZERO TRUST (Via ID)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { listingId, startDate, endDate, reason } = body;

    // 2. VALIDATION ENTRÉES
    if (!listingId || !startDate || !endDate) {
        return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
        return NextResponse.json({ error: "La date de fin doit être après le début." }, { status: 400 });
    }

    // 3. VÉRIFICATION DE PROPRIÉTÉ (ANTI-IDOR)
    // Le listing doit exister ET appartenir à l'utilisateur
    const listing = await prisma.listing.findUnique({
        where: { 
            id: listingId,
            hostId: userId // 🔒 Verrouillage
        }
    });

    if (!listing) {
        return NextResponse.json({ error: "Annonce introuvable ou accès refusé." }, { status: 403 });
    }

    // 4. VÉRIFICATION DE CHEVAUCHEMENT
    // On vérifie s'il existe déjà une réservation CONFIRMÉE ou PAYÉE sur cette période
    const overlap = await prisma.booking.findFirst({
        where: {
            listingId: listingId,
            status: { in: ['CONFIRMED', 'PAID'] },
            OR: [
                { startDate: { lte: end }, endDate: { gte: start } }
            ]
        }
    });

    if (overlap) {
        return NextResponse.json({ error: "Impossible : Ces dates sont déjà occupées." }, { status: 409 });
    }

    // 5. CRÉATION DU BLOCAGE
    // Un blocage est techniquement une réservation "CONFIRMED" à prix 0 pour le propriétaire
    await prisma.booking.create({
        data: {
            startDate: start,
            endDate: end,
            totalPrice: 0, // Gratuit (Blocage)
            status: "CONFIRMED",
            guestId: userId, // Le propriétaire est son propre invité
            listingId: listingId,
            // On pourrait stocker la "reason" dans un champ commentaire si le schéma le permettait,
            // mais ici on le garde juste pour log ou on l'ignore si pas de champ.
        }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur Block Dates:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
