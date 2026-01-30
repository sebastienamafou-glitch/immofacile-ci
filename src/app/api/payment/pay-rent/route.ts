import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// =============================================================================
// CONFIGURATION & RÈGLES
// =============================================================================
const FINANCE_RULES = {
  TENANT_FIXED_FEE: 20000, // Frais de dossier Agence (Entrée)
  CURRENCY: 'XOF'
};

const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  BASE_URL: "https://api-checkout.cinetpay.com/v2/payment",
  NOTIFY_URL: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay` 
};

// DTO
interface PaymentInitRequest {
  type: 'RENT' | 'INVESTMENT';
  referenceId: string; // ID Bail ou ID Contrat
  phone: string;
  paymentMethod?: string;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, name: true, email: true } // Optimisation
    });

    if (!user || !user.email) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 403 });

    const body: PaymentInitRequest = await request.json();
    const { type, referenceId, phone } = body;

    if (!referenceId || !phone) {
        return NextResponse.json({ error: "Référence et téléphone requis" }, { status: 400 });
    }

    // ID Transaction Unique
    const transactionId = uuidv4();
    
    let amountToPay = 0;
    let description = "";

    // =========================================================================
    // ROUTE A : PAIEMENT DE LOYER
    // =========================================================================
    if (type === 'RENT') {
        const lease = await prisma.lease.findUnique({
            where: { id: referenceId },
            include: { property: true }
        });
        
        if (!lease) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });

        // 🔒 SÉCURITÉ : Seul le locataire du bail peut payer
        if (lease.tenantId !== user.id) {
            return NextResponse.json({ error: "Ce bail ne vous appartient pas." }, { status: 403 });
        }

        // Vérif premier paiement
        const previousPayment = await prisma.payment.findFirst({
            where: { leaseId: lease.id, status: "SUCCESS" }
        });
        const isFirstPayment = !previousPayment;

        if (isFirstPayment) {
            amountToPay = lease.monthlyRent + (lease.depositAmount || 0) + FINANCE_RULES.TENANT_FIXED_FEE;
            description = `Entrée Lieux - ${lease.property.title}`;
        } else {
            amountToPay = lease.monthlyRent;
            description = `Loyer - ${lease.property.title}`;
        }

        // Création PENDING
        await prisma.payment.create({
            data: {
                leaseId: lease.id,
                amount: amountToPay,
                type: isFirstPayment ? "DEPOSIT" : "LOYER",
                status: "PENDING",
                reference: transactionId, // Lien avec CinetPay
                date: new Date(),
                // Initialisation à zéro (Ventilation faite par le Webhook)
                amountOwner: 0, 
                amountPlatform: 0,
                amountAgent: 0,
                amountAgency: 0 
            }
        });
    }

    // =========================================================================
    // ROUTE B : INVESTISSEMENT
    // =========================================================================
    else if (type === 'INVESTMENT') {
        const contract = await prisma.investmentContract.findUnique({
            where: { id: referenceId }
        });
        
        if (!contract) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
        
        // 🔒 SÉCURITÉ : Seul l'investisseur peut payer
        if (contract.userId !== user.id) {
            return NextResponse.json({ error: "Ce contrat ne vous appartient pas." }, { status: 403 });
        }

        if (contract.status === 'ACTIVE') return NextResponse.json({ error: "Déjà payé." }, { status: 400 });

        amountToPay = contract.amount;
        description = `Investissement Pack ${contract.packName || 'ImmoFacile'}`;
        
        // Liaison ID Transaction
        await prisma.investmentContract.update({
            where: { id: contract.id },
            data: { 
                paymentReference: transactionId,
                status: 'PENDING'
            }
        });
    } 
    
    else {
        return NextResponse.json({ error: "Type de paiement inconnu" }, { status: 400 });
    }

    // =========================================================================
    // 3. ENVOI CINETPAY
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
      customer_name: user.name || "Client ImmoFacile",
      customer_city: "Abidjan",
      customer_country: "CI",
      // URLs
      notify_url: CINETPAY_CONFIG.NOTIFY_URL,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=processing`,
      channels: "ALL",
      metadata: JSON.stringify({ type, referenceId, userId: user.id })
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
