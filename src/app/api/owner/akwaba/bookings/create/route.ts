import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto"; // ✅ 1. IMPORT AJOUTÉ

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const session = await auth();
    // Correction de la vérification de session
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Connectez-vous pour réserver." }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { listingId, startDate, endDate, guests } = body;

    // 2. VALIDATION DES DONNÉES
    if (!listingId || !startDate || !endDate) {
        return NextResponse.json({ error: "Dates ou logement manquants" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    // On enlève l'heure pour comparer juste les jours
    now.setHours(0,0,0,0);

    // ✅ SÉCURITÉ DATE : Pas de voyage dans le temps ou dans le passé
    if (end <= start) {
        return NextResponse.json({ error: "La date de départ doit être après l'arrivée." }, { status: 400 });
    }
    if (start < now) {
        return NextResponse.json({ error: "Impossible de réserver dans le passé." }, { status: 400 });
    }
    
    // Calcul des nuitées
    const diffTime = end.getTime() - start.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (nights < 1) return NextResponse.json({ error: "Minimum 1 nuit" }, { status: 400 });

    // 3. VÉRIFICATION LOGEMENT & DISPO
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return NextResponse.json({ error: "Logement introuvable" }, { status: 404 });

    // Anti-Double Booking (Strict)
    // On vérifie s'il existe une résa CONFIRMÉE ou PAYÉE qui chevauche
    const conflict = await prisma.booking.findFirst({
        where: {
            listingId,
            status: { in: ['CONFIRMED', 'PAID'] }, // On ignore les PENDING abandonnés
            // Logique de chevauchement : (StartA <= EndB) et (EndA >= StartB)
            AND: [
                { startDate: { lt: end } }, // Note: lt (strict) car on peut arriver le jour du départ du précédent
                { endDate: { gt: start } }
            ]
        }
    });

    if (conflict) {
        return NextResponse.json({ error: "Désolé, ces dates ne sont plus disponibles." }, { status: 409 });
    }

    // 4. CALCUL DU PRIX (Entiers Stricts)
    const totalPrice = Math.round(listing.pricePerNight * nights); // ✅ Sécurité Int
    
    // Modèle économique
    const COMMISSION_RATE = 0.15; 
    const commissionAmount = Math.floor(totalPrice * COMMISSION_RATE);
    const hostAmount = totalPrice - commissionAmount;

    // 5. TRANSACTION ATOMIQUE
    const booking = await prisma.$transaction(async (tx) => {
        // A. Créer le Booking
        const newBooking = await tx.booking.create({
            data: {
                startDate: start,
                endDate: end,
                totalPrice: totalPrice,
                status: "PENDING", 
                guestId: userId,
                listingId: listing.id,
                guestCount: Number(guests) || 1, // ✅ 2. SAUVEGARDE DU GUEST COUNT (Selon Schema)
            }
        });

        // B. Créer l'intention de paiement (Ledger)
        await tx.bookingPayment.create({
            data: {
                amount: totalPrice,
                provider: "WAVE", // Sera mis à jour par le Webhook CinetPay
                transactionId: crypto.randomUUID(), 
                status: "PENDING",
                agencyCommission: commissionAmount,
                hostPayout: hostAmount,
                bookingId: newBooking.id,
                // platformCommission: 0 (Valeur par défaut du schema)
            }
        });

        return newBooking;
    });

    return NextResponse.json({ success: true, bookingId: booking.id });

  } catch (error: any) {
    console.error("Erreur Booking:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la réservation" }, { status: 500 });
  }
}
