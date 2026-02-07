import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

/**
 * 🛡️ PROTOCOLE FINANCIER V2 (Compatible TOPUP & DEVIS)
 * 1. Atomicité : Le paiement est créé en base AVANT l'appel CinetPay.
 * 2. Traçabilité : Utilisation de 'idempotencyKey' pour verrouiller les doublons.
 * 3. Fiscalité : TVA (18%) isolée sur la commission plateforme.
 */

const FINANCE_RULES = {
  CURRENCY: 'XOF',
  TVA_RATE: 0.18,
  KYC_LIMITS: {
    1: 200000,   // Non vérifié
    2: 2000000,  // ID Vérifié
    3: 10000000  // Full KYC
  }
};

const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  BASE_URL: "https://api-checkout.cinetpay.com/v2/payment",
  NOTIFY_URL: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay` 
};

// ✅ AMÉLIORATION : Validation conditionnelle stricte
const paymentInitSchema = z.object({
  type: z.enum(['RENT', 'INVESTMENT', 'QUOTE', 'DEPOSIT', 'TOPUP']), 
  referenceId: z.string(), 
  idempotencyKey: z.string(),
  phone: z.string().regex(/^(01|05|07)\d{8}$/, "Format CI invalide (10 chiffres requis)"),
  manualAmount: z.number().optional()
}).refine((data) => {
  // Règle : Si TOPUP, le montant est obligatoire et > 100
  if (data.type === 'TOPUP') {
    return data.manualAmount && data.manualAmount >= 100;
  }
  return true;
}, {
  message: "Montant invalide ou manquant pour le rechargement (min 100 FCFA)",
  path: ["manualAmount"]
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const transactionId = uuidv4();
  
  try {
    // 1. 🔒 AUTHENTIFICATION
    const session = await auth();
    const userId = session?.user?.id || request.headers.get("x-user-id");

    if (!userId) {
        return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        include: { kyc: true, finance: true }
    });

    if (!user || !user.email) {
        return NextResponse.json({ error: "Profil incomplet (Email requis)" }, { status: 403 });
    }

    // 2. 🛡️ VALIDATION DES ENTRÉES
    const body = await request.json();
    const validation = paymentInitSchema.safeParse(body);
    
    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }
    const { type, referenceId, phone, idempotencyKey, manualAmount } = validation.data;

    // Check Idempotence (Anti-Doublon)
    const existingPayment = await prisma.payment.findUnique({
        where: { idempotencyKey }
    });
    if (existingPayment) {
        return NextResponse.json({ error: "Transaction déjà initiée (Idempotence)" }, { status: 409 });
    }

    // 3. 🧠 LOGIQUE MÉTIER & VENTILATION
    let amountToPay = 0;
    let description = "";
    let breakdown = { amountOwner: 0, amountPlatform: 0, amountAgency: 0, platformTaxAmount: 0 };
    
    // --- CAS A : TOPUP (RECHARGEMENT WALLET) ---
    if (type === 'TOPUP') {
        // La validation Zod a déjà garanti que manualAmount existe et est > 100
        amountToPay = manualAmount!; 
        description = "Rechargement Wallet ImmoFacile";
        breakdown.amountOwner = amountToPay; // Pour un topup, "Owner" = l'utilisateur lui-même
    }

    // --- CAS B : LOYER / CAUTION ---
    else if (type === 'RENT' || type === 'DEPOSIT') {
        const lease = await prisma.lease.findUnique({
            where: { id: referenceId },
            include: { property: { include: { agency: true } } }
        });

        if (!lease || lease.tenantId !== user.id) {
            return NextResponse.json({ error: "Bail introuvable ou accès refusé" }, { status: 403 });
        }

        // Calcul Montant
        amountToPay = type === 'DEPOSIT' 
            ? (lease.depositAmount + lease.monthlyRent) 
            : lease.monthlyRent;

        // Ventilation
        const commissionRate = lease.agencyCommissionRate || 0.10; 
        const totalCommission = Math.floor(amountToPay * commissionRate);
        const platformShareHT = Math.floor(totalCommission * 0.20); 
        
        breakdown.platformTaxAmount = Math.floor(platformShareHT * FINANCE_RULES.TVA_RATE);
        breakdown.amountPlatform = platformShareHT;
        breakdown.amountAgency = totalCommission - platformShareHT - breakdown.platformTaxAmount;
        breakdown.amountOwner = amountToPay - totalCommission;

        description = `${type === 'DEPOSIT' ? 'Entrée' : 'Loyer'} - ${lease.property.title}`;
    } 
    
    // --- CAS C : DEVIS (MAINTENANCE) ---
    else if (type === 'QUOTE') {
        const quote = await prisma.quote.findUnique({
            where: { id: referenceId },
            include: { incident: { include: { property: true } } }
        });

        // Sécurité IDOR
        if (!quote || quote.incident.property.ownerId !== user.id) {
            return NextResponse.json({ error: "Devis introuvable ou accès refusé" }, { status: 403 });
        }
        
        if (quote.status !== 'PENDING') {
             return NextResponse.json({ error: "Ce devis n'est plus en attente de paiement" }, { status: 400 });
        }

        amountToPay = quote.totalAmount;
        
        // Ventilation Maintenance (5% frais de service)
        const serviceFeeHT = Math.floor(amountToPay * 0.05); 
        
        breakdown.platformTaxAmount = Math.floor(serviceFeeHT * FINANCE_RULES.TVA_RATE);
        breakdown.amountPlatform = serviceFeeHT;
        breakdown.amountOwner = amountToPay - serviceFeeHT - breakdown.platformTaxAmount; // Net Artisan

        description = `Devis #${quote.number} - ${quote.incident.title}`;
    }

    // --- CAS D : INVESTISSEMENT ---
    else if (type === 'INVESTMENT') {
        if (user.kyc?.status !== 'VERIFIED') {
            return NextResponse.json({ error: "KYC Vérifié requis pour investir" }, { status: 403 });
        }
        const contract = await prisma.investmentContract.findUnique({ where: { id: referenceId } });
        if (!contract || contract.userId !== user.id) return NextResponse.json({ error: "Contrat invalide" }, { status: 403 });

        amountToPay = contract.amount;
        description = `Investissement ${contract.packName}`;
        breakdown.amountPlatform = amountToPay; 
    }

    // 4. 👮 CONTRÔLE DES PLAFONDS (LBC-FT)
    const userTier = (user.finance?.kycTier || 1) as keyof typeof FINANCE_RULES.KYC_LIMITS;
    const limit = FINANCE_RULES.KYC_LIMITS[userTier];
    
    if (amountToPay > limit) {
        return NextResponse.json({ 
            error: `Plafond Tier ${userTier} dépassé.`,
            limit: limit,
            attempted: amountToPay
        }, { status: 403 });
    }

    // 5. 💾 ENREGISTREMENT EN BASE (État PENDING)
    // Mapping du type Frontend vers l'Enum Prisma PaymentType
    // Note: 'CHARGES' est utilisé comme fourre-tout pour TOPUP car l'enum Prisma ne contient pas TOPUP
    let prismaPaymentType: "LOYER" | "DEPOSIT" | "FEE" | "CHARGES" = "LOYER";
    
    if (type === 'TOPUP') prismaPaymentType = 'CHARGES';
    else if (type === 'QUOTE') prismaPaymentType = 'FEE';
    else if (type === 'DEPOSIT') prismaPaymentType = 'DEPOSIT';

    await prisma.payment.create({
        data: {
            amount: amountToPay,
            type: prismaPaymentType,
            status: "PENDING",
            method: "CINETPAY",
            reference: transactionId,
            idempotencyKey: idempotencyKey,
            date: new Date(),
            
            // Ventilation
            amountOwner: breakdown.amountOwner,
            amountPlatform: breakdown.amountPlatform,
            amountAgency: breakdown.amountAgency,
            platformTaxAmount: breakdown.platformTaxAmount,
            platformTaxRate: FINANCE_RULES.TVA_RATE,

            // Relations
            // Pour TOPUP, leaseId et quoteId seront undefined, ce qui est correct.
            leaseId: (type === 'RENT' || type === 'DEPOSIT') ? referenceId : undefined,
            quoteId: (type === 'QUOTE') ? referenceId : undefined
        }
    });

    // 6. 📡 APPEL CINETPAY
    // Construction des métadonnées vitales pour le webhook
    const metadataPayload = {
        type,
        referenceId,
        userId: user.id, // VITAL pour le TOPUP (le webhook l'utilise pour savoir qui créditer)
        idempotencyKey
    };

    const cpResponse = await axios.post(CINETPAY_CONFIG.BASE_URL, {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: transactionId,
      amount: amountToPay,
      currency: FINANCE_RULES.CURRENCY,
      description: description,
      customer_email: user.email,
      customer_phone_number: phone,
      customer_name: user.name,
      customer_city: "Abidjan",
      customer_country: "CI",
      notify_url: CINETPAY_CONFIG.NOTIFY_URL,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=processing`,
      channels: "ALL",
      metadata: JSON.stringify(metadataPayload)
    });

    if (cpResponse.data.code === "201") {
        return NextResponse.json({ 
            success: true, 
            paymentUrl: cpResponse.data.data.payment_url,
            transactionId: transactionId 
        });
    } else {
        throw new Error(cpResponse.data.description || "Erreur inconnue CinetPay");
    }

  } catch (error: any) {
    console.error(`[PAYMENT_INIT_ERROR] ${error.message}`);
    const errorMessage = error.response?.data?.description || error.message || "Erreur initialisation paiement";
    
    return NextResponse.json({ 
        error: errorMessage,
    }, { status: 500 });
  }
}
