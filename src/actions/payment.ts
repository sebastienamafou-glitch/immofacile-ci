'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Vos clés CinetPay (à mettre dans .env)
const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY;
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID;

export async function initiateInvestmentPayment(contractId: string, phoneNumber: string) {
  try {
    // 1. AUTHENTIFICATION & SÉCURITÉ
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };

    // 2. RÉCUPÉRATION DE LA SOURCE DE VÉRITÉ (DATABASE)
    // On ne fait JAMAIS confiance au montant envoyé par le client
    const contract = await prisma.investmentContract.findUnique({
      where: { 
        id: contractId,
        userId: session.user.id // On vérifie que le contrat appartient bien au user
      },
      include: { user: true }
    });

    if (!contract) return { error: "Contrat introuvable." };
    if (contract.status === 'ACTIVE') return { error: "Ce contrat est déjà payé." };

    // 3. GÉNÉRATION TRANSACTION ID UNIQUE
    const transactionId = `INV-${contract.id}-${Date.now()}`;

    // 4. PRÉPARATION PAYLOAD CINETPAY
    // C'est ici que la sécurité se joue : on utilise contract.amount (DB) et pas une variable externe
    const payload = {
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: contract.amount, // ✅ MONTANT BLINDÉ DEPUIS LA DB
      currency: "XOF",
      description: `Investissement ${contract.packName || 'Standard'}`,
      channels: "ALL",
      customer_id: session.user.id,
      customer_name: contract.user.name || "Investisseur",
      customer_surname: "", // Optionnel
      customer_phone_number: phoneNumber,
      customer_email: contract.user.email || "",
      customer_address: "CI",
      customer_city: "Abidjan",
      customer_country: "CI",
      // URL de notification (Webhook) pour valider le paiement plus tard
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay`, 
      // URL de retour client
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/investor/contract/${contract.id}?payment=success`
    };

    // 5. APPEL API CINETPAY (Server-to-Server)
    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.code !== "201") {
      console.error("Erreur CinetPay:", data);
      return { error: data.description || "Erreur d'initialisation CinetPay" };
    }

    // 6. ENREGISTREMENT DE LA TRANSACTION EN ATTENTE (Audit Trail)
    // On crée une trace dans la table Transaction pour suivre le statut
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount: contract.amount,
        type: "DEBIT", // Sortie du wallet (ou Paiement Direct)
        balanceType: "WALLET",
        reason: `Investissement: ${contract.packName}`,
        status: "PENDING", // En attente du Webhook
        reference: transactionId, // Lien avec CinetPay
        // previousHash: ... (Si vous avez un système de hashage blockchain)
      }
    });

    // On lie aussi la référence au contrat
    await prisma.investmentContract.update({
      where: { id: contractId },
      data: { paymentReference: transactionId }
    });

    return { 
      success: true, 
      paymentUrl: data.data.payment_url,
      transactionId: transactionId
    };

  } catch (error: any) {
    console.error("Erreur Payment Server Action:", error);
    return { error: "Erreur serveur critique." };
  }
}
export async function initiateBookingPayment(bookingId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };

    // 1. VERROUILLAGE & SÉCURITÉ DB
    const booking = await prisma.booking.findUnique({
      where: { 
        id: bookingId,
        guestId: session.user.id 
      },
      include: { guest: true, listing: true }
    });

    if (!booking) return { error: "Réservation introuvable." };
    if (booking.status !== 'PENDING') return { error: "Cette réservation n'est plus en attente de paiement." };

    // 2. GÉNÉRATION TRANSACTION ID (Format Akwaba)
    const transactionId = `AKW-${booking.id}-${Date.now()}`;

    // 3. PAYLOAD CINETPAY STRICT
    const payload = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: booking.totalPrice, 
      currency: "XOF",
      description: `Akwaba - Séjour à ${booking.listing.title.substring(0, 30)}`,
      channels: "ALL",
      customer_id: session.user.id,
      customer_name: booking.guest.name || "Guest",
      customer_surname: "",
      customer_email: booking.guest.email || "",
      customer_phone_number: booking.guest.phone || "0000000000", // Rempli par CinetPay si vide
      customer_address: "CI",
      customer_city: "Abidjan",
      customer_country: "CI",
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay`, 
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/guest/trips?payment=success`
    };

    // 4. APPEL CINETPAY
    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.code !== "201") {
      console.error("Erreur CinetPay Akwaba:", data);
      return { error: data.description || "Erreur d'initialisation du paiement." };
    }

    // 5. TRAÇABILITÉ (Audit Trail via BookingPayment)
    await prisma.bookingPayment.create({
      data: {
        amount: booking.totalPrice,
        provider: "CINETPAY",
        transactionId: transactionId,
        status: "PENDING",
        bookingId: booking.id,
        // Ces valeurs seront calculées réellement par le Webhook lors du SUCCESS
        agencyCommission: 0, 
        hostPayout: 0,
        platformCommission: 0
      }
    });

    return { success: true, paymentUrl: data.data.payment_url };

  } catch (error: any) {
    console.error("Erreur initiateBookingPayment:", error);
    return { error: "Erreur serveur critique." };
  }
}
