import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireKyc } from "@/lib/gatekeeper"; 
import { v4 as uuidv4 } from "uuid";
import { differenceInDays } from "date-fns";
import axios from "axios"; // ✅ Pour appeler l'API CinetPay

// Configuration CinetPay (Mêmes clés que le webhook)
const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  BASE_URL: "https://api-checkout.cinetpay.com/v2/payment"
};

export async function POST(request: Request) {
  try {
    // 1. AUTHENTIFICATION
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email; // Besoin de l'email pour CinetPay

    if (!userId || !userEmail) {
        return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // 2. GATEKEEPER : KYC
    try {
        await requireKyc(userId);
    } catch (e) {
        return NextResponse.json({ error: "KYC Requis", code: "KYC_REQUIRED" }, { status: 403 });
    }

    const body = await request.json();
    const { listingId, startDate, endDate, guestCount } = body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 3. TRANSACTION ATOMIQUE : Création de la réservation EN ATTENTE
    const { booking, paymentUrl } = await prisma.$transaction(async (tx) => {
        
        // A. Vérifications
        const listing = await tx.listing.findUnique({
            where: { id: listingId },
            select: { pricePerNight: true, id: true, title: true, hostId: true }
        });

        if (!listing) throw new Error("NOT_FOUND");
        if (listing.hostId === userId) throw new Error("OWNER_BOOKING");

        // B. Disponibilité
        const conflict = await tx.booking.findFirst({
            where: {
                listingId,
                status: { in: ['CONFIRMED', 'PAID'] },
                OR: [{ startDate: { lte: end }, endDate: { gte: start } }]
            }
        });

        if (conflict) throw new Error("CONFLICT");

        // C. Calcul du Prix
        const nights = differenceInDays(end, start);
        if (nights <= 0) throw new Error("INVALID_DATES");

        const subTotal = listing.pricePerNight * nights;
        const platformFee = Math.round(subTotal * 0.05); // 5% Frais Service
        const totalPrice = subTotal + platformFee;

        // D. Génération ID Transaction Unique
        const transactionId = `AKW-${uuidv4()}`; // Préfixe AKW pour Akwaba

        // E. Création Booking (PENDING)
        const newBooking = await tx.booking.create({
            data: {
                startDate: start,
                endDate: end,
                totalPrice: totalPrice,
                status: "PENDING", // ⚠️ En attente de paiement
                guestCount: guestCount || 1,
                guestId: userId,
                listingId: listing.id,
            }
        });

        // F. Pré-Création Trace Paiement (PENDING)
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

        // G. APPEL API CINETPAY (Initialisation)
        // Note: On le fait DANS la transaction pour rollbacker si l'API échoue
        // mais idéalement on le sort pour ne pas bloquer la DB. Ici c'est acceptable pour le volume.
        const cinetPayPayload = {
            apikey: CINETPAY_CONFIG.API_KEY,
            site_id: CINETPAY_CONFIG.SITE_ID,
            transaction_id: transactionId,
            amount: totalPrice,
            currency: "XOF",
            description: `Réservation ${listing.title} (${nights} nuits)`,
            notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/cinetpay`, // Votre Webhook
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant/bookings/${newBooking.id}`,
            channels: "ALL",
            customer_id: userId,
            customer_name: session.user?.name || "Voyageur",
            customer_surname: "", // Optionnel
            customer_email: userEmail,
            customer_phone_number: "0700000000", // À récupérer du profil user idéalement
            customer_address: "CI",
            customer_city: "Abidjan",
            customer_country: "CI",
            customer_state: "CI",
            customer_zip_code: "00225"
        };

        const response = await axios.post(CINETPAY_CONFIG.BASE_URL, cinetPayPayload);

        if (response.data.code !== "201") {
            throw new Error(`CINETPAY_ERROR: ${response.data.description}`);
        }

        return { 
            booking: newBooking, 
            paymentUrl: response.data.data.payment_url 
        };
    });

    // 4. RÉPONSE AU FRONTEND : On renvoie l'URL de paiement
    return NextResponse.json({ 
        success: true, 
        bookingId: booking.id,
        paymentUrl: paymentUrl // Le front devra rediriger l'user ici
    });

  } catch (error: any) {
    console.error("Booking Init Error:", error);
    
    // Gestion des erreurs propre
    const errorMap: Record<string, { msg: string, status: number }> = {
        "NOT_FOUND": { msg: "Logement introuvable", status: 404 },
        "CONFLICT": { msg: "Dates indisponibles", status: 409 },
        "INVALID_DATES": { msg: "Dates invalides", status: 400 },
        "OWNER_BOOKING": { msg: "Réservation impossible sur votre propre bien", status: 400 }
    };

    // Si erreur CinetPay
    if (error.message.startsWith("CINETPAY_ERROR")) {
        return NextResponse.json({ error: "Erreur initiée par le processeur de paiement", details: error.message }, { status: 502 });
    }

    const err = errorMap[error.message] || { msg: "Erreur serveur", status: 500 };
    return NextResponse.json({ error: err.msg }, { status: err.status });
  }
}
