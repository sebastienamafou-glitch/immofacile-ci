'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
// ✅ IMPORT DES ENUMS
import { 
  InvestmentStatus, 
  TransactionType, 
  BalanceType, 
  TransactionStatus, 
  BookingStatus, 
  PaymentProvider, 
  PaymentStatus 
} from "@prisma/client";

const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY;
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID;

export async function initiateInvestmentPayment(contractId: string, phoneNumber: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };

    const contract = await prisma.investmentContract.findUnique({
      where: { 
        id: contractId,
        userId: session.user.id 
      },
      include: { user: true }
    });

    if (!contract) return { error: "Contrat introuvable." };
    if (contract.status === InvestmentStatus.ACTIVE) return { error: "Ce contrat est déjà payé." }; // 🔒 Enum strict

    const transactionId = `INV-${contract.id}-${Date.now()}`;

    const payload = {
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: contract.amount, 
      currency: "XOF",
      description: `Investissement ${contract.packName || 'Standard'}`,
      channels: "ALL",
      customer_id: session.user.id,
      customer_name: contract.user.name || "Investisseur",
      customer_surname: "",
      customer_phone_number: phoneNumber,
      customer_email: contract.user.email || "",
      customer_address: "CI",
      customer_city: "Abidjan",
      customer_country: "CI",
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay`, 
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/investor/contract/${contract.id}?payment=success`
    };

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

    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount: contract.amount,
        type: TransactionType.DEBIT, // 🔒 Enum strict
        balanceType: BalanceType.WALLET, // 🔒 Enum strict
        reason: `Investissement: ${contract.packName}`,
        status: TransactionStatus.PENDING, // 🔒 Enum strict
        reference: transactionId, 
      }
    });

    await prisma.investmentContract.update({
      where: { id: contractId },
      data: { paymentReference: transactionId }
    });

    return { 
      success: true, 
      paymentUrl: data.data.payment_url,
      transactionId: transactionId
    };

  } catch (error: unknown) {
    console.error("Erreur Payment Server Action:", error);
    return { error: "Erreur serveur critique." };
  }
}

export async function initiateBookingPayment(bookingId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };

    const booking = await prisma.booking.findUnique({
      where: { 
        id: bookingId,
        guestId: session.user.id 
      },
      include: { guest: true, listing: true }
    });

    if (!booking) return { error: "Réservation introuvable." };
    if (booking.status !== BookingStatus.PENDING) return { error: "Cette réservation n'est plus en attente de paiement." }; 

    const transactionId = `AKW-${booking.id}-${Date.now()}`;
    
    // ✅ VENTILATION PRÉVISIONNELLE (Identique au Webhook)
    const platformFee = Math.round(booking.totalPrice * 0.10);
    const hostPayout = booking.totalPrice - platformFee;

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
      customer_phone_number: booking.guest.phone || "0000000000", 
      customer_address: "CI",
      customer_city: "Abidjan",
      customer_country: "CI",
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/cinetpay`, // ✅ CORRECTION: sans "s"
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/guest/trips?payment=success`
    };

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

    // ✅ UPSERT: Sécurité contre les clics multiples
    await prisma.bookingPayment.upsert({
        where: { bookingId: booking.id },
        update: { transactionId, status: PaymentStatus.PENDING },
        create: {
          amount: booking.totalPrice,
          provider: PaymentProvider.CINETPAY, // ✅ CORRECTION
          transactionId: transactionId,
          status: PaymentStatus.PENDING, 
          bookingId: booking.id,
          agencyCommission: 0, 
          platformCommission: platformFee,
          hostPayout: hostPayout
        }
    });

    return { success: true, paymentUrl: data.data.payment_url };

  } catch (error: unknown) {
    console.error("Erreur initiateBookingPayment:", error);
    return { error: "Erreur serveur critique." };
  }
}
