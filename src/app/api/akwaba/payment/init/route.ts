import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Auth requise" }, { status: 401 });

    const { bookingId } = await request.json();

    // 1. On récupère la réservation
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { listing: true }
    });

    if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

    // 2. On génère un ID unique pour cette transaction
    const transactionId = `AKW-${uuidv4().slice(0, 8)}`; 
    
    // 3. ⚠️ CRUCIAL : On enregistre l'intention de paiement MAINTENANT
    // C'est grâce à ça que le Webhook retrouvera la transaction plus tard.
    await prisma.bookingPayment.create({
        data: {
            bookingId: booking.id,
            amount: booking.totalPrice,
            provider: "CINETPAY", // Valeur par défaut, sera mise à jour par le webhook
            transactionId: transactionId, // LE PONT : C'est cet ID qui fait le lien
            status: "PENDING",
            agencyCommission: 0,
            hostPayout: 0
        }
    });

    // 4. On prépare la demande pour CinetPay
    const cinetPayPayload = {
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID, // Attention, variable corrigée selon votre route.ts
        transaction_id: transactionId,
        amount: booking.totalPrice,
        currency: "XOF",
        channels: "ALL",
        description: `Réservation ${booking.listing.title}`,
        
        // 👇 C'EST ICI QUE LE LIEN SE FAIT VERS VOTRE GROS FICHIER 👇
        // On pointe vers votre dossier "api/webhook" (vu dans votre capture d'écran)
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`,
        
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/akwaba/checkout/${booking.id}?status=success`,
        customer_id: session.user.id,
        customer_name: session.user.name || "Client",
        customer_surname: "",
        metadata: JSON.stringify({ bookingId: booking.id, source: "AKWABA" })
    };

    // 5. Appel CinetPay
    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cinetPayPayload)
    });

    const result = await response.json();

    if (result.code !== "201") {
        // En cas d'échec, on marque le paiement comme échoué en base
        await prisma.bookingPayment.update({
            where: { transactionId: transactionId },
            data: { status: "FAILED" }
        });
        return NextResponse.json({ error: result.description || "Erreur CinetPay" }, { status: 400 });
    }

    return NextResponse.json({ paymentUrl: result.data.payment_url });

  } catch (error: any) {
    console.error("Init Payment Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
