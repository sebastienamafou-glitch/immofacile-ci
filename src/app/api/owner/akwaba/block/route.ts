import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. AUTHENTIFICATION
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 404 });

    const body = await request.json();
    const { listingId, startDate, endDate } = body;

    if (!listingId || !startDate || !endDate) {
        return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    // [AJOUT CRITIQUE] 2. VÉRIFICATION DE PROPRIÉTÉ
    // On s'assure que le demandeur est bien le propriétaire de l'annonce
    const listing = await prisma.listing.findUnique({
        where: { 
            id: listingId,
            hostId: owner.id // Doit matcher l'ID du user connecté
        }
    });

    if (!listing) {
        return NextResponse.json({ error: "Annonce introuvable ou accès refusé." }, { status: 403 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
        return NextResponse.json({ error: "La date de fin doit être après le début." }, { status: 400 });
    }

    // 3. VÉRIFICATION DE CHEVAUCHEMENT (Votre code existant, très bien)
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
        return NextResponse.json({ error: "Impossible : Ces dates sont déjà réservées." }, { status: 409 });
    }

    // 4. CRÉATION DU BLOCAGE
    await prisma.booking.create({
        data: {
            startDate: start,
            endDate: end,
            totalPrice: 0,
            status: "CONFIRMED", 
            guestId: owner.id,
            listingId: listingId
        }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur Block Dates:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
