import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const CINETPAY_URL = "https://api-checkout.cinetpay.com/v2/payment";

export async function POST(req: Request) {
  try {
    // 1. VÉRIFICATION DE LA SESSION
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. EXTRACTION DES DONNÉES
    const body = await req.json();
    const { amount, phone, provider } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 100) {
        return NextResponse.json({ error: "Montant invalide (minimum 100 FCFA)" }, { status: 400 });
    }

    // 3. CRÉATION DE LA RÉFÉRENCE UNIQUE
    const transactionId = `TOPUP-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // 4. ENREGISTREMENT PRISMA (Statut PENDING)
    await prisma.payment.create({
      data: {
        amount: numAmount,
        type: "TOPUP",
        status: "PENDING",
        reference: transactionId,
        method: provider || "MOBILE_MONEY",
      }
    });

    // 5. INITIALISATION CINETPAY
    const cinetPayData = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: numAmount,
      currency: "XOF",
      channels: "ALL",
      description: "Rechargement Portefeuille Babimmo",
      customer_id: session.user.id,
      customer_name: session.user.name || "Locataire",
      customer_email: session.user.email,
      customer_phone_number: phone.replace(/\s+/g, ''), // Nettoyage du numéro
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant/payments`,
      
      // ⚠️ CRITIQUE : Les métadonnées lues par le Webhook pour créditer le bon utilisateur
      metadata: JSON.stringify({ 
          userId: session.user.id, 
          type: "TOPUP" 
      })
    };

    const response = await axios.post(CINETPAY_URL, cinetPayData);

    if (response.data.code === '201') {
      return NextResponse.json({
        success: true,
        paymentToken: response.data.data.payment_token,
        paymentUrl: response.data.data.payment_url
      });
    } else {
      console.error("Erreur CinetPay:", response.data);
      return NextResponse.json({ error: "Le fournisseur de paiement a rejeté la requête." }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error("TopUp API Error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
