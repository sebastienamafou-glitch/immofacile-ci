import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireKyc } from "@/lib/gatekeeper"; // ✅ Import du gardien

export async function POST(request: Request) {
  try {
    const session = await auth();
    // 1. Sécurité Auth
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const userId = session.user.id;

    // 🛑 2. GATEKEEPER : KYC OBLIGATOIRE
    try {
        await requireKyc(userId);
    } catch (e) {
        return NextResponse.json({ 
            error: "Veuillez vérifier votre identité pour réserver.",
            code: "KYC_REQUIRED"
        }, { status: 403 });
    }

    const body = await request.json();
    const { listingId, startDate, endDate, guestCount, totalPrice } = body;

    // 3. Validation
    if (!listingId || !startDate || !endDate || !totalPrice) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 4. Création
    const booking = await prisma.booking.create({
      data: {
        guestId: userId,
        listingId: listingId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        guestCount: guestCount || 1, 
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
