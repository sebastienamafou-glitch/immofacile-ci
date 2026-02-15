import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireKyc } from "@/lib/gatekeeper"; 
import { v4 as uuidv4 } from "uuid";
import { differenceInDays } from "date-fns";
import axios from "axios";

// Configuration CinetPay
const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  BASE_URL: "https://api-checkout.cinetpay.com/v2/payment"
};

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ & AUTH
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId || !userEmail) {
        return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // 2. GATEKEEPER : KYC
    try {
        await requireKyc(userId);
    } catch (e) {
        return NextResponse.json({ error: "KYC Requis pour réserver", code: "KYC_REQUIRED" }, { status: 403 });
    }

    const body = await request.json();
    const { listingId, startDate, endDate, guestCount } = body;

    // Normalisation des dates pour éviter les bugs de fuseau horaire
    // On fixe arbitrairement : Arrivée 14h00, Départ 11h00
    const start = new Date(startDate);
    start.setHours(14, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(11, 0, 0, 0);

    if (start >= end) {
        return NextResponse.json({ error: "La date de départ doit être après l'arrivée" }, { status: 400 });
    }

    // 3. PRÉPARATION DB (TRANSACTION RAPIDE)
    // On prépare tout en base, mais on appelle PAS CinetPay ici pour ne pas bloquer la DB
    const bookingResult = await prisma.$transaction(async (tx) => {
        
        // A. Vérif Listing & Propriétaire
        const listing = await tx.listing.findUnique({
            where: { id: listingId },
            select: { pricePerNight: true, id: true, title: true, hostId: true }
        });

        if (!listing) throw new Error("NOT_FOUND");
        if (listing.hostId === userId) throw new Error("OWNER_BOOKING");

        // B. Vérif Disponibilité (Logique stricte)
        // (Start A < End B) ET (End A > Start B) = Chevauchement
        const conflict = await tx.booking.findFirst({
            where: {
                listingId,
                status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN'] }, // On inclut CHECKED_IN par sécurité
                AND: [
                    { startDate: { lt: end } },
                    { endDate: { gt: start } }
                ]
            }
        });

        if (conflict) throw new Error("CONFLICT");

        // C. Calcul du Prix
        const nights = differenceInDays(end, start);
        // Minimum 1 nuit facturée même si < 24h
        const billedNights = nights > 0 ? nights : 1; 

        const subTotal = listing.pricePerNight * billedNights;
        const platformFee = Math.round(subTotal * 0.05); // 5% Frais Service
        const totalPrice = subTotal + platformFee;

        // D. ID Transaction
        const transactionId = `AKW-${uuidv4()}`;

        // E. Création Booking (PENDING)
        const newBooking = await tx.booking.create({
            data: {
                startDate: start,
                endDate: end,
                totalPrice: totalPrice,
                status: "PENDING",
                guestCount: guestCount || 1,
                guestId: userId,
                listingId: listing.id,
            }
        });

        // F. Trace Paiement
        await tx.bookingPayment.create({
            data: {
                amount: totalPrice,
                provider: "CINETPAY", 
                transactionId: transactionId,
                status: "PENDING",
                agencyCommission: 0, 
                platformCommission: platformFee,
                hostPayout: subTotal,
                bookingId: newBooking.id
            }
        });

        // On retourne les données nécessaires pour l'appel API suivant
        return { 
            booking: newBooking, 
            transactionId, 
            totalPrice, 
            title: listing.title,
            nights: billedNights
        };
    });

    // 4. APPEL API CINETPAY (HORS TRANSACTION) 🚀
    // Si ça plante ici, la DB est déjà libérée.
    
    // ✅ URL CORRIGÉE (Pluriel 'webhooks')
    const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay`; 
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant/bookings/${bookingResult.booking.id}`;

    const cinetPayPayload = {
        apikey: CINETPAY_CONFIG.API_KEY,
        site_id: CINETPAY_CONFIG.SITE_ID,
        transaction_id: bookingResult.transactionId,
        amount: bookingResult.totalPrice,
        currency: "XOF",
        description: `Réservation : ${bookingResult.title} (${bookingResult.nights} nuits)`,
        notify_url: notifyUrl,
        return_url: returnUrl,
        channels: "ALL",
        customer_id: userId,
        customer_name: session.user?.name || "Client",
        customer_email: userEmail,
        customer_phone_number: "0700000000", // À améliorer plus tard avec le vrai tel
        customer_city: "Abidjan",
        customer_country: "CI",
    };

    const response = await axios.post(CINETPAY_CONFIG.BASE_URL, cinetPayPayload);

    if (response.data.code !== "201") {
        // En cas d'échec CinetPay, le booking reste en PENDING (Abandon de panier).
        // C'est le comportement attendu.
        console.error("CinetPay Error:", response.data);
        throw new Error(`CINETPAY_ERROR: ${response.data.description}`);
    }

    // 5. RÉPONSE SUCCESS
    return NextResponse.json({ 
        success: true, 
        bookingId: bookingResult.booking.id,
        paymentUrl: response.data.data.payment_url 
    });

  } catch (error: any) {
    console.error("Booking Init Error:", error);
    
    // Mapping des erreurs pour le frontend
    const errorMap: Record<string, { msg: string, status: number }> = {
        "NOT_FOUND": { msg: "Logement introuvable", status: 404 },
        "CONFLICT": { msg: "Ces dates ne sont plus disponibles", status: 409 },
        "OWNER_BOOKING": { msg: "Vous ne pouvez pas réserver votre propre bien", status: 400 }
    };

    if (error.message?.startsWith("CINETPAY_ERROR")) {
        return NextResponse.json({ error: "Erreur du service de paiement. Veuillez réessayer." }, { status: 502 });
    }

    const err = errorMap[error.message] || { msg: "Erreur serveur lors de la réservation", status: 500 };
    return NextResponse.json({ error: err.msg }, { status: err.status });
  }
}
