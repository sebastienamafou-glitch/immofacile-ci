import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    // 1. Sécurité
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, startDate, endDate, guestCount, totalPrice } = body;

    // 2. Validation
    if (!listingId || !startDate || !endDate || !totalPrice) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 3. Création (Maintenant guestCount est accepté !)
    const booking = await prisma.booking.create({
      data: {
        guestId: session.user.id,
        listingId: listingId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        guestCount: guestCount || 1, // ✅ On enregistre bien le nombre de voyageurs
        totalPrice: totalPrice,
        status: "PENDING", 
      }
    });

    return NextResponse.json({ 
      success: true, 
      bookingId: booking.id,
      message: "Réservation initiée." 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Erreur Booking Akwaba:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
