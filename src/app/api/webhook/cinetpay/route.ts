import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { createHmac, timingSafeEqual } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ✅ Importation de nos forteresses métier (Services SRP)
import { processRealEstatePayment } from "@/services/billing/realEstateBilling";
import { processInvestmentPayment } from "@/services/billing/investmentBilling";
import { processAkwabaPayment } from "@/services/billing/akwabaBilling";

// =============================================================================
// 🔧 CONFIGURATION & SÉCURITÉ
// =============================================================================
const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  SECRET_KEY: process.env.CINETPAY_SECRET_KEY,
  CHECK_URL: "https://api-checkout.cinetpay.com/v2/payment/check"
};

export const dynamic = 'force-dynamic';

// =============================================================================
// 🛡️ TYPAGE STRICT (Zod Schema)
// =============================================================================
const cinetPayWebhookSchema = z.object({
  cpm_trans_id: z.string().optional(),
  cpm_custom: z.string().optional(),
  cpm_site_id: z.string().optional(),
  cpm_amount: z.string().optional(),
  cpm_currency: z.string().optional(),
  cpm_trans_date: z.string().optional(),
  // Zod supprimera (strip) automatiquement toute autre clé non définie ici
}).refine((data) => data.cpm_trans_id || data.cpm_custom, {
  message: "Un identifiant de transaction (cpm_trans_id ou cpm_custom) est strictement requis",
});

// =============================================================================
// 🚀 WEBHOOK HANDLER (Le Chef d'Orchestre)
// =============================================================================
export async function POST(request: Request) {
  let transactionId = "";
  const rawBody = await request.text();

  try {
    // 1. SÉCURITÉ PÉRIMÉTRIQUE (HMAC)
    const signatureHeader = request.headers.get("x-cinetpay-signature");
    if (!signatureHeader) return new NextResponse("Unauthorized: Missing Signature", { status: 401 });

    if (CINETPAY_CONFIG.SECRET_KEY) {
      const expectedSignature = createHmac("sha256", CINETPAY_CONFIG.SECRET_KEY).update(rawBody).digest("hex");
      const sigBuffer = Buffer.from(signatureHeader);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
        return new NextResponse("Unauthorized: Invalid Signature", { status: 401 });
      }
    }

    // 2. EXTRACTION ET VALIDATION ZOD
    let bodyData: unknown;
    try {
      bodyData = JSON.parse(rawBody);
    } catch (e) {
      bodyData = Object.fromEntries(new URLSearchParams(rawBody).entries());
    }

    const parsedBody = cinetPayWebhookSchema.safeParse(bodyData);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Payload malformé ou non conforme" }, { status: 400 });
    }

    transactionId = String(parsedBody.data.cpm_trans_id || parsedBody.data.cpm_custom || "");
    if (!transactionId) return NextResponse.json({ error: "Missing Transaction ID" }, { status: 400 });

    // 3. VÉRIFICATION CHEZ CINETPAY (Double Check)
    const verification = await axios.post(CINETPAY_CONFIG.CHECK_URL, {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: transactionId
    });

    const apiData = verification.data.data;
    const isValidPayment = verification.data.code === "00" && apiData.status === "ACCEPTED";
    const amountPaid = parseInt(apiData.amount || "0", 10);
    
    const postTransactionActions: Array<() => Promise<void>> = [];

    // 4. EXÉCUTION ATOMIQUE, LOCK & ROUTAGE O(1)
    try {
      await prisma.$transaction(async (tx) => {
        
        // 🔒 VERROU D'IDEMPOTENCE STRICT (Insert-to-Lock Pattern)
        // En cas de doublon concurrent, lève immédiatement une erreur P2002.
        await tx.processedWebhook.create({
          data: { id: transactionId }
        });

        if (transactionId.startsWith("AKW-")) {
          const bookingPayment = await tx.bookingPayment.findUnique({ where: { transactionId } });
          if (bookingPayment) {
              await processAkwabaPayment(tx, bookingPayment, isValidPayment, amountPaid, transactionId, apiData, postTransactionActions);
          }
        } 
        else if (transactionId.startsWith("INV-")) {
          const investmentContract = await tx.investmentContract.findUnique({ where: { paymentReference: transactionId } });
          if (investmentContract) {
              await processInvestmentPayment(tx, investmentContract, isValidPayment, amountPaid, transactionId);
          }
        } 
        else {
          // Fallback immobilier
          const paymentRecord = await tx.payment.findUnique({
            where: { reference: transactionId },
            include: {
              lease: { include: { property: { include: { agency: true } } } },
              quote: { include: { artisan: true } }
            }
          });
          if (paymentRecord) {
              await processRealEstatePayment(tx, paymentRecord, isValidPayment, amountPaid, transactionId, apiData);
          }
        }

      }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });

    } catch (error) {
      // Interception chirurgicale de la violation de contrainte unique
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        console.log(`[Idempotence] Race condition évitée (Doublon intercepté) : ${transactionId}`);
        // Renvoie un 200 OK pour accuser réception à CinetPay et stopper ses retries
        return new NextResponse("OK", { status: 200 });
      }
      // Rejette les vraies erreurs vers le catch global (Sentry / 500)
      throw error; 
    }

    // 5. DÉLÉGATION ASYNCHRONE DES EFFETS DE BORD (Anti-Timeout)
    // Exécution "Fire-and-Forget" pour libérer instantanément la connexion de CinetPay
    Promise.allSettled(postTransactionActions.map(action => action())).then((results) => {
        results.forEach((result) => {
            if (result.status === "rejected") {
                console.error("[Webhook Post-Action Error]:", result.reason);
                Sentry.captureException(result.reason, { 
                    tags: { source: "webhook_post_action", transaction_id: transactionId } 
                });
            }
        });
    });

    return new NextResponse("OK", { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error(`[Fatal Webhook Error] Tx: ${transactionId}`, errorMessage);
    Sentry.captureException(error, { tags: { source: "webhook_cinetpay", transaction_id: transactionId }});
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
