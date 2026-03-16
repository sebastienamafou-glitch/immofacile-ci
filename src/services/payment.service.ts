import { PaymentStatus, PaymentType } from '@prisma/client'; 
import axios from 'axios';
import { prisma } from '@/lib/prisma'; 

// Configuration en dur sécurisée (à basculer en DB plus tard si besoin)
const FINANCE_RULES = {
  TENANT_FIXED_FEE: 20000,
};

const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  BASE_URL: "https://api-checkout.cinetpay.com/v2/payment",
  NOTIFY_URL: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay`
};

export class PaymentService {

  // =========================================================================
  // 1. INITIER LE PAIEMENT (Génération du lien CinetPay)
  // =========================================================================
  async initiateRentPayment(leaseId: string, user: { id: string, email: string, phone: string, name?: string }) {
    
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { property: true }
    });

    if (!lease) throw new Error("Bail introuvable");

    // 🔒 SÉCURITÉ : On vérifie que c'est bien le locataire du bail qui paie
    if (lease.tenantId !== user.id) {
        throw new Error("Accès refusé : Vous n'êtes pas le locataire de ce bail.");
    }

    // Vérifier l'historique pour déterminer si c'est le premier paiement
    const previousSuccessPayment = await prisma.payment.findFirst({
      where: { leaseId: lease.id, status: PaymentStatus.SUCCESS }
    });

    const isFirstPayment = !previousSuccessPayment;
    const baseRent = lease.monthlyRent;

    let totalAmountToPay = baseRent;
    let description = `Loyer - ${lease.property.title}`;

    // --- LOGIQUE PREMIER MOIS ---
    if (isFirstPayment) {
      const caution = lease.depositAmount; 
      const fraisDossier = FINANCE_RULES.TENANT_FIXED_FEE; 
      totalAmountToPay = baseRent + caution + fraisDossier;
      description = `Signature Bail (Loyer + Caution + Frais) - ${lease.property.title}`;
    }

    // 🚀 ALIGNEMENT ARCHITECTURAL : On utilise le préfixe LEA- (Lease) pour le webhook
    const transactionId = `LEA-${lease.id}-${Date.now()}`;

    // Création du paiement (PENDING)
    const payment = await prisma.payment.create({
      data: {
        leaseId: lease.id,
        userId: user.id, // ✅ On attache correctement le locataire à la transaction
        amount: totalAmountToPay,
        type: isFirstPayment ? PaymentType.DEPOSIT : PaymentType.LOYER, 
        status: PaymentStatus.PENDING,
        reference: transactionId,
        date: new Date(),
        amountOwner: 0,
        amountPlatform: 0,
        amountAgent: 0
      }
    });

    // Payload CinetPay
    const payload = {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: transactionId,
      amount: totalAmountToPay,
      currency: "XOF",
      description: description,
      customer_email: user.email || "",
      customer_phone_number: user.phone || "0000000000",
      customer_name: user.name || "Locataire",
      notify_url: CINETPAY_CONFIG.NOTIFY_URL,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant?payment=success`, 
      channels: "ALL",
    };

    try {
      const response = await axios.post(CINETPAY_CONFIG.BASE_URL, payload);
      if (response.data.code === "201") {
        return { paymentUrl: response.data.data.payment_url, paymentId: payment.id };
      } else {
        throw new Error(`Erreur CinetPay: ${response.data.description}`);
      }
    } catch (error) {
      console.error("Erreur Init Paiement:", error);
      throw new Error("Impossible d'initialiser le paiement avec la passerelle.");
    }
  }
}
