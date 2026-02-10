import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger"; // Pour l'audit
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

// Configuration CinetPay (Centralisée)
const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  BASE_URL: "https://api-checkout.cinetpay.com/v2/payment"
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. SÉCURITÉ : Auth
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const bookingId = params.id;

    // 2. RÉCUPÉRATION & VÉRIFICATION (Zero Trust)
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { 
        listing: { select: { title: true } },
        payment: true // On récupère l'info de paiement existante
      }
    });

    if (!booking) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }

    // A. Vérifier que c'est bien le locataire qui demande à payer
    if (booking.guestId !== session.user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // B. Vérifier que la réservation est payable
    if (booking.status !== "PENDING") { 
      return NextResponse.json({ 
        error: `Impossible de payer une réservation statut : ${booking.status}` 
      }, { status: 400 });
    }

    // 3. GÉNÉRATION D'UNE NOUVELLE TRANSACTION
    // À chaque tentative, on doit générer un ID unique pour CinetPay, sinon erreur "Transaction ID already exists"
    const newTransactionId = `AKW-RETRY-${uuidv4().slice(0, 8)}`;

    // 4. MISE À JOUR DE LA TRACE DE PAIEMENT
    // On écrase l'ancien transactionId par le nouveau. Le Webhook utilisera celui-ci.
    await prisma.bookingPayment.upsert({
      where: { bookingId: booking.id }, //  bookingId est unique
      update: {
        transactionId: newTransactionId,
        status: "PENDING",
        provider: "CINETPAY"
      },
      create: { // Au cas improbable où le paiement n'existait pas encore
        bookingId: booking.id,
        amount: booking.totalPrice,
        transactionId: newTransactionId,
        status: "PENDING",
        provider: "CINETPAY",
        agencyCommission: 0,
        hostPayout: 0
      }
    });

    // 5. APPEL API CINETPAY
    const cinetPayPayload = {
        apikey: CINETPAY_CONFIG.API_KEY,
        site_id: CINETPAY_CONFIG.SITE_ID,
        transaction_id: newTransactionId,
        amount: booking.totalPrice,
        currency: "XOF",
        description: `Paiement (Retry) : ${booking.listing.title}`,
        // Urls
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/cinetpay`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant/bookings/${booking.id}`,
        channels: "ALL",
        // Infos Client
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

    // 6. AUDIT LOG
    await logActivity({
        action: "PAYMENT_INITIATED", // Assurez-vous d'avoir ce type dans logger.ts ou utilisez un existant
        entityId: booking.id,
        entityType: "BOOKING",
        userId: session.user.id,
        metadata: { 
            transactionId: newTransactionId, 
            attempt: "retry" 
        }
    });

    return NextResponse.json({ 
        success: true, 
        paymentUrl: response.data.data.payment_url 
    });

  } catch (error: any) {
    console.error("Retry Payment Error:", error);
    return NextResponse.json({ error: "Erreur lors de l'initialisation du paiement" }, { status: 500 });
  }
}
