import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// =============================================================================
// CONFIGURATION & RÈGLES
// =============================================================================
const FINANCE_RULES = {
  TENANT_FIXED_FEE: 20000, // Frais de dossier Agence
  CURRENCY: 'XOF'
};

const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  BASE_URL: "https://api-checkout.cinetpay.com/v2/payment",
  // URL du webhook blindé que nous avons créé
  NOTIFY_URL: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay` 
};

// DTO : Ce que le Frontend doit envoyer
interface PaymentInitRequest {
  type: 'RENT' | 'INVESTMENT';
  referenceId: string; // ID du Bail (leaseId) OU ID du Contrat (contractId)
  phone: string;
  paymentMethod?: string;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ & AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 403 });

    const body: PaymentInitRequest = await request.json();
    const { type, referenceId, phone } = body;

    if (!referenceId || !phone) {
        return NextResponse.json({ error: "Référence et téléphone requis" }, { status: 400 });
    }

    // Identifiant Unique de la Transaction (Généré ici pour lier les deux bouts)
    const transactionId = uuidv4();
    
    let amountToPay = 0;
    let description = "";
    let metadata: any = {};

    // =========================================================================
    // ROUTE A : PAIEMENT DE LOYER (Gestion Locative)
    // =========================================================================
    if (type === 'RENT') {
        const lease = await prisma.lease.findUnique({
            where: { id: referenceId },
            include: { property: true }
        });
        if (!lease) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });

        // Vérification : Est-ce le premier paiement ?
        const previousPayment = await prisma.payment.findFirst({
            where: { leaseId: lease.id, status: "SUCCESS" }
        });
        const isFirstPayment = !previousPayment;

        if (isFirstPayment) {
            // Premier mois : Loyer + Caution + Frais 20k
            amountToPay = lease.monthlyRent + (lease.depositAmount || 0) + FINANCE_RULES.TENANT_FIXED_FEE;
            description = `Entrée Lieux (Loyer+Caution+Frais) - ${lease.property.title}`;
        } else {
            // Mois suivants : Loyer simple
            amountToPay = lease.monthlyRent;
            description = `Loyer - ${lease.property.title}`;
        }

        // Création de la ligne de paiement (PENDING) avec les champs du nouveau SCHEMA
        await prisma.payment.create({
            data: {
                leaseId: lease.id,
                amount: amountToPay,
                type: isFirstPayment ? "DEPOSIT" : "LOYER",
                status: "PENDING",
                reference: transactionId,
                date: new Date(),
                // Initialisation explicite à 0 (Sera rempli par le Webhook)
                amountOwner: 0, 
                amountPlatform: 0,
                amountAgent: 0,
                amountAgency: 0 // ✅ Nouveau champ Agence
            }
        });
    }

    // =========================================================================
    // ROUTE B : INVESTISSEMENT (Crowdfunding)
    // =========================================================================
    else if (type === 'INVESTMENT') {
        const contract = await prisma.investmentContract.findUnique({
            where: { id: referenceId }
        });
        
        if (!contract) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
        if (contract.status === 'ACTIVE') return NextResponse.json({ error: "Déjà payé." }, { status: 400 });

        amountToPay = contract.amount;
        description = `Investissement Pack ${contract.packName || 'STANDARD'}`;
        
        // ⚠️ CRITIQUE : On lie l'ID CinetPay au contrat MAINTENANT.
        // C'est grâce à ça que le Webhook retrouvera le contrat plus tard.
        await prisma.investmentContract.update({
            where: { id: contract.id },
            data: { 
                paymentReference: transactionId, // <-- Le lien vital
                status: 'PENDING'
            }
        });
    } 
    
    else {
        return NextResponse.json({ error: "Type de paiement invalide" }, { status: 400 });
    }

    // =========================================================================
    // 2. APPEL API CINETPAY (Commun)
    // =========================================================================
    const payload = {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: transactionId,
      amount: amountToPay,
      currency: FINANCE_RULES.CURRENCY,
      description: description,
      // Infos Client
      customer_email: user.email,
      customer_phone_number: phone,
      customer_name: user.name || "Client",
      customer_city: "Abidjan",
      customer_country: "CI",
      // Configuration technique
      notify_url: CINETPAY_CONFIG.NOTIFY_URL,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=processing`,
      channels: "ALL",
      metadata: JSON.stringify({ type, referenceId }) // Utile pour le debug
    };

    const response = await axios.post(CINETPAY_CONFIG.BASE_URL, payload);

    if (response.data.code === "201") {
        return NextResponse.json({ 
            success: true, 
            paymentUrl: response.data.data.payment_url,
            transactionId: transactionId 
        });
    } else {
        throw new Error(`CinetPay Refus: ${response.data.description}`);
    }

  } catch (error: any) {
    console.error("🔥 Payment Init Error:", error.response?.data || error.message);
    return NextResponse.json({ 
        error: "Échec de l'initialisation bancaire.", 
        details: error.message 
    }, { status: 500 });
  }
}
