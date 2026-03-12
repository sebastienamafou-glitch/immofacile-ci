import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const CINETPAY_URL = "https://api-checkout.cinetpay.com/v2/payment";

// ✅ 1. VALIDATION STRICTE
const topupSchema = z.object({
  amount: z.number().min(100, "Montant minimum 100 FCFA"),
  phone: z.string().min(8, "Numéro invalide"),
  provider: z.string().optional()
});

export async function POST(req: Request) {
  try {
    // 2. VÉRIFICATION DE LA SESSION (ZERO TRUST)
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 3. EXTRACTION ET SÉCURISATION DES DONNÉES
    const body = await req.json();
    const validation = topupSchema.safeParse(body);
    
    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }

    const { amount, phone, provider } = validation.data;

    // 4. CRÉATION DE LA RÉFÉRENCE UNIQUE
    const transactionId = `TOPUP-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // 5. ENREGISTREMENT PRISMA (Statut PENDING)
    await prisma.payment.create({
      data: {
        amount: amount,
        type: "TOPUP",
        status: "PENDING",
        reference: transactionId,
        method: provider || "MOBILE_MONEY",
        userId: userId // ✅ CORRECTION CRITIQUE : Liaison du paiement à l'utilisateur
      }
    });

    // 6. INITIALISATION CINETPAY
    const cinetPayData = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: amount,
      currency: "XOF",
      channels: "ALL",
      description: "Rechargement Portefeuille Babimmo",
      customer_id: userId,
      customer_name: session.user.name || "Locataire",
      customer_email: session.user.email || "no-reply@babimmo.ci",
      customer_phone_number: phone.replace(/\s+/g, ''), 
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant/payments`,
      metadata: JSON.stringify({ userId: userId, type: "TOPUP" })
    };

    const response = await axios.post(CINETPAY_URL, cinetPayData);

    if (response.data.code === '201') {
      return NextResponse.json({
        success: true,
        paymentToken: response.data.data.payment_token,
        paymentUrl: response.data.data.payment_url
      });
    } else {
      console.error("Erreur logique CinetPay:", response.data);
      return NextResponse.json({ error: "Le fournisseur de paiement a rejeté l'initiation." }, { status: 400 });
    }

  } catch (error: unknown) {
    // ✅ CORRECTION : Gestion propre des erreurs réseau Axios
    if (axios.isAxiosError(error)) {
        console.error("Erreur réseau CinetPay:", error.response?.data || error.message);
        return NextResponse.json({ error: "Service de paiement temporairement indisponible." }, { status: 502 });
    }

    console.error("TopUp API Error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
