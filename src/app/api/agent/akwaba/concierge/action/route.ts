import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. VÉRIFICATION AGENT (Role + Agence)
    const agent = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, agencyId: true }
    });

    if (!agent || agent.role !== 'AGENT' || !agent.agencyId) {
        return NextResponse.json({ error: "Accès refusé (Agent/Agence requis)." }, { status: 403 });
    }

    // 3. VALIDATION INPUT
    const body = await request.json();
    const { bookingId, action } = body; // action: 'CHECK_IN' ou 'CHECK_OUT'

    if (!bookingId || !action) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

    // 4. RECUPÉRER LA RÉSERVATION (Avec vérification périmètre Agence)
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { listing: { select: { agencyId: true } } }
    });

    if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

    // 🔒 SÉCURITÉ : On vérifie que la réservation appartient à l'agence de l'agent
    if (booking.listing.agencyId !== agent.agencyId) {
        return NextResponse.json({ error: "Cette réservation ne dépend pas de votre agence." }, { status: 403 });
    }

    // 5. LOGIQUE MÉTIER (Machine à états)
    const today = new Date();
    today.setHours(0,0,0,0); // On compare les jours calendaires
    
    const startDate = new Date(booking.startDate);
    startDate.setHours(0,0,0,0);

    // SCÉNARIO A : CHECK-IN (Arrivée)
    if (action === 'CHECK_IN') {
        if (booking.status !== 'CONFIRMED' && booking.status !== 'PAID') {
            return NextResponse.json({ error: "Check-in impossible : Le statut n'est pas CONFIRMED/PAID." }, { status: 400 });
        }
        // Sécurité temporelle : On ne peut pas check-in avant la date prévue
        if (today < startDate) {
             return NextResponse.json({ error: "Trop tôt ! Le séjour n'a pas commencé." }, { status: 400 });
        }

        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CHECKED_IN' }
        });

        return NextResponse.json({ success: true, message: "Check-in validé. Client installé." });
    }

    // SCÉNARIO B : CHECK-OUT (Départ)
    if (action === 'CHECK_OUT') {
        // On peut faire un check-out si le client est "CHECKED_IN"
        if (booking.status !== 'CHECKED_IN') {
             return NextResponse.json({ error: "Check-out impossible : Le client n'a pas fait de Check-in." }, { status: 400 });
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
