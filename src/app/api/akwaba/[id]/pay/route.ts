import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger"; 
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

// Configuration CinetPay
const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  BASE_URL: "https://api-checkout.cinetpay.com/v2/payment"
};

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> } // ✅ Compatibilité Next.js 15
) {
  try {
    const params = await props.params; // ✅ On attend les params
    const bookingId = params.id;

    // 1. SÉCURITÉ : Auth
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION (Zero Trust)
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { 
        listing: { select: { title: true } }
      }
    });

    if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

    // A. Vérifier le propriétaire
    if (booking.guestId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // B. Vérifier le statut
    if (booking.status !== "PENDING") { 
      return NextResponse.json({ error: `Statut invalide : ${booking.status}` }, { status: 400 });
    }

    // 3. GÉNÉRATION ID UNIQUE
    // On utilise un timestamp + uuid court pour garantir l'unicité chez CinetPay à chaque essai
    const newTransactionId = `AKW-${Date.now().toString().slice(-6)}-${uuidv4().slice(0, 4)}`;

    // 4. MISE À JOUR DE LA TRACE (Upsert)
    await prisma.bookingPayment.upsert({
      where: { bookingId: booking.id }, 
      update: {
        transactionId: newTransactionId,
        status: "PENDING",
        provider: "CINETPAY"
      },
      create: {
        bookingId: booking.id,
        amount: booking.totalPrice,
        transactionId: newTransactionId,
        status: "PENDING",
        provider: "CINETPAY",
        agencyCommission: 0,
        hostPayout: 0
      }
    });

    // 5. APPEL CINETPAY
    // ✅ CORRECTION URL WEBHOOK (Pluriel)
    const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay`; 
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant/bookings/${booking.id}`;

    const cinetPayPayload = {
        apikey: CINETPAY_CONFIG.API_KEY,
        site_id: CINETPAY_CONFIG.SITE_ID,
        transaction_id: newTransactionId,
        amount: booking.totalPrice,
        currency: "XOF",
        description: `Paiement : ${booking.listing.title}`,
        notify_url: notifyUrl,
        return_url: returnUrl,
        channels: "ALL",
        customer_id: session.user.id,
        customer_name: session.user.name || "Client",
        customer_email: session.user.email || "",
        customer_city: "Abidjan",
        customer_country: "CI",
    };

    const response = await axios.post(CINETPAY_CONFIG.BASE_URL, cinetPayPayload);

    if (response.data.code !== "201") {
        throw new Error(`CinetPay Error: ${response.data.description}`);
    }

    // 6. LOG (Attention : Ajoutez "PAYMENT_INITIATED" dans logger.ts)
    await logActivity({
        action: "PAYMENT_INITIATED", 
        entityId: booking.id,
        entityType: "BOOKING",
        userId: session.user.id,
        metadata: { transactionId: newTransactionId }
    });

    return NextResponse.json({ 
        success: true, 
        paymentUrl: response.data.data.payment_url 
    });

  } catch (error: any) {
    console.error("Retry Payment Error:", error);
    return NextResponse.json({ error: "Erreur technique paiement" }, { status: 500 });
  }
}
