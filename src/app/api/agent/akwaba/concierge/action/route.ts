import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { bookingId, action } = body; // action: 'CHECK_IN' ou 'CHECK_OUT'

    if (!bookingId || !action) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

    // 2. RECUPÉRER LA RÉSERVATION
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId }
    });

    if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

    // 3. LOGIQUE MÉTIER (Machine à états)
    const today = new Date();
    // On enlève les heures pour comparer les jours calendaires
    today.setHours(0,0,0,0);
    const startDate = new Date(booking.startDate);
    startDate.setHours(0,0,0,0);

    // SCÉNARIO A : CHECK-IN (Arrivée)
    if (action === 'CHECK_IN') {
        if (booking.status !== 'CONFIRMED') {
            return NextResponse.json({ error: "Check-in impossible : Le statut n'est pas 'CONFIRMED'." }, { status: 400 });
        }
        // Sécurité temporelle : On ne peut pas check-in avant la date prévue
        if (today < startDate) {
             return NextResponse.json({ error: "Trop tôt ! Le séjour commence plus tard." }, { status: 400 });
        }

        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CHECKED_IN' }
        });

        return NextResponse.json({ success: true, message: "Check-in validé. Client installé." });
    }

    // SCÉNARIO B : CHECK-OUT (Départ)
    if (action === 'CHECK_OUT') {
        // On peut faire un check-out si le client est "CHECKED_IN" ou même "CONFIRMED" (si oubli de check-in)
        if (booking.status !== 'CHECKED_IN' && booking.status !== 'CONFIRMED') {
             return NextResponse.json({ error: "Check-out impossible : Statut incohérent." }, { status: 400 });
        }

        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'COMPLETED' } // Le cycle est fini
        });

        return NextResponse.json({ success: true, message: "Check-out validé. Séjour terminé." });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });

  } catch (error) {
    console.error("Concierge Action Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
