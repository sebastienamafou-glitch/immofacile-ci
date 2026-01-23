import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId, startDate, endDate, totalPrice, userEmail } = body;

    // 1. Validation de base
    if (!listingId || !startDate || !endDate || !totalPrice || !userEmail) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 2. Récupérer l'utilisateur
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 401 });
    }

    // 3. VÉRIFICATION DE DISPONIBILITÉ (CRUCIAL)
    // On vérifie s'il existe déjà une réservation CONFIRMÉE ou PAYÉE qui chevauche ces dates
    const conflict = await prisma.booking.findFirst({
      where: {
        listingId: listingId,
        status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN'] },
        OR: [
          {
            startDate: { lte: new Date(endDate) },
            endDate: { gte: new Date(startDate) }
          }
        ]
      }
    });

    if (conflict) {
      return NextResponse.json({ error: "Désolé, ce logement n'est plus disponible pour ces dates." }, { status: 409 });
    }

    // 4. Création de la Réservation
    const newBooking = await prisma.booking.create({
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalPrice: parseInt(totalPrice),
        status: 'CONFIRMED', // En prod, on mettrait 'PENDING' en attendant le paiement Wave
        guestId: user.id,
        listingId: listingId
      }
    });

    return NextResponse.json({ 
        success: true, 
        bookingId: newBooking.id,
        message: "Réservation confirmée !" 
    });

  } catch (error) {
    console.error("Erreur Booking:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la réservation" }, { status: 500 });
  }
}
