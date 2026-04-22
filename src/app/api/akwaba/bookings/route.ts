// src/app/api/akwaba/booking/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { createAkwabaBooking } from "@/services/akwabaService";

const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  BASE_URL: "https://api-checkout.cinetpay.com/v2/payment"
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId || !userEmail) {
        return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, startDate, endDate } = body;

    // 1. APPEL DU SERVICE CENTRAL (Création pure)
    const booking = await createAkwabaBooking({ userId, listingId, startDate, endDate });

    // 2. INITIALISATION DU PAIEMENT (Spécifique à l'API)
    const transactionId = uuidv4();
    // ✅ CORRECTION : webhook sans "S"
    const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/cinetpay`; 

    const cinetPayPayload = {
        apikey: CINETPAY_CONFIG.API_KEY,
        site_id: CINETPAY_CONFIG.SITE_ID,
        transaction_id: transactionId,
        amount: booking.totalPrice,
        currency: "XOF",
        channels: "ALL",
        description: `Réservation Akwaba - ${booking.id}`,
        notify_url: notifyUrl,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/guest/trips`,
        customer_email: userEmail,
        customer_name: "Guest",
        customer_surname: "Babimmo",
        customer_city: "Abidjan",
        customer_country: "CI",
    };

    const response = await axios.post(CINETPAY_CONFIG.BASE_URL, cinetPayPayload);

    if (response.data.code !== "201") {
        throw new Error(`CINETPAY_ERROR: ${response.data.description}`);
    }

    return NextResponse.json({ 
        success: true, 
        bookingId: booking.id,
        paymentUrl: response.data.data.payment_url 
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    
    // Mapping des erreurs métier du Service
    const errorMap: Record<string, { msg: string, status: number }> = {
        "KYC_REQUIRED": { msg: "KYC Requis pour réserver", status: 403 },
        "NOT_FOUND": { msg: "Logement introuvable", status: 404 },
        "CONFLICT": { msg: "Ces dates ne sont plus disponibles", status: 409 },
        "OWNER_BOOKING": { msg: "Vous ne pouvez pas réserver votre propre bien", status: 400 },
        "INVALID_DATES": { msg: "Dates invalides", status: 400 }
    };

    if (errorMap[msg]) {
        return NextResponse.json({ error: errorMap[msg].msg, code: msg }, { status: errorMap[msg].status });
    }

    if (msg.startsWith("CINETPAY_ERROR")) {
        return NextResponse.json({ error: "Erreur du service de paiement." }, { status: 502 });
    }

    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
