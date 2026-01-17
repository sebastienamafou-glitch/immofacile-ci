import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Singleton
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// Configuration (à placer idéalement dans constants.ts)
const FINANCE_RULES = {
  TENANT_FIXED_FEE: 20000, // Frais de dossier (1er paiement)
  CURRENCY: 'XOF'
};

const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  BASE_URL: "https://api-checkout.cinetpay.com/v2/payment",
  // URL du webhook qui recevra la notification
  NOTIFY_URL: `${process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL}/api/payment/webhook` 
};

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 403 });

    const body = await request.json();
    const { leaseId, phone, name } = body; // On utilise l'email du token, pas du body

    if (!leaseId || !phone) {
        return NextResponse.json({ error: "ID du bail et téléphone requis" }, { status: 400 });
    }

    // 2. RÉCUPÉRATION DU BAIL
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { property: true }
    });

    if (!lease) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });

    // 3. CALCUL DU MONTANT (Logique Métier)
    // On vérifie si c'est le tout premier paiement validé pour ce bail
    const previousPayment = await prisma.payment.findFirst({
        where: { leaseId: lease.id, status: "SUCCESS" }
    });

    const isFirstPayment = !previousPayment;
    
    let totalAmount = lease.monthlyRent;
    let description = `Loyer - ${lease.property.title}`;

    if (isFirstPayment) {
        // Premier mois : Loyer + Caution + Frais Dossier
        totalAmount = lease.monthlyRent + (lease.depositAmount || 0) + FINANCE_RULES.TENANT_FIXED_FEE;
        description = `Signature Bail (Loyer + Caution + Frais) - ${lease.property.title}`;
    }

    // 4. CRÉATION DU PAIEMENT EN BASE (PENDING)
    const transactionId = uuidv4();

    await prisma.payment.create({
      data: {
        leaseId: lease.id,
        amount: totalAmount,
        type: isFirstPayment ? "DEPOSIT" : "LOYER", // Enum: DEPOSIT ou LOYER
        status: "PENDING",
        reference: transactionId,
        date: new Date(),
        amountOwner: 0,    // Sera calculé au succès
        amountPlatform: 0, // Sera calculé au succès
        amountAgent: 0     // Sera calculé au succès
      }
    });

    // 5. APPEL CINETPAY
    const payload = {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: transactionId,
      amount: totalAmount,
      currency: FINANCE_RULES.CURRENCY,
      description: description,
      customer_email: user.email,
      customer_phone_number: phone,
      customer_name: name || user.name || "Locataire",
      notify_url: CINETPAY_CONFIG.NOTIFY_URL,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant?payment=success`,
      channels: "ALL",
      metadata: JSON.stringify({ leaseId, isFirstPayment })
    };

    const response = await axios.post(CINETPAY_CONFIG.BASE_URL, payload);

    if (response.data.code === "201") {
        return NextResponse.json({ 
            success: true, 
            paymentUrl: response.data.data.payment_url 
        });
    } else {
        throw new Error(`Erreur CinetPay: ${response.data.description}`);
    }

  } catch (error: any) {
    console.error("Erreur PayRent:", error);
    return NextResponse.json({ error: "Erreur d'initialisation du paiement", details: error.message }, { status: 500 });
  }
}
