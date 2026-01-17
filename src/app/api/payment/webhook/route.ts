import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Singleton Obligatoire
import axios from "axios";

// Configuration
const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  CHECK_URL: "https://api-checkout.cinetpay.com/v2/payment/check"
};

const PLATFORM_COMMISSION_RATE = 0.05; // 5% de commission sur les loyers

export async function POST(request: Request) {
  try {
    // 1. EXTRACTION ROBUSTE (FormData ou JSON)
    let transactionId = "";
    
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        transactionId = (formData.get('cpm_trans_id') || formData.get('cpm_custom')) as string;
    } else {
        try {
            const jsonBody = await request.json();
            transactionId = jsonBody.cpm_trans_id || jsonBody.cpm_custom;
        } catch (e) {
            console.warn("Webhook: Impossible de parser le JSON");
        }
    }

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID manquant" }, { status: 400 });
    }

    // 2. VÉRIFICATION CINETPAY (Serveur à Serveur)
    // On ne fait jamais confiance aux données envoyées directement, on interroge l'API CinetPay
    const checkPayload = {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: transactionId
    };

    const response = await axios.post(CINETPAY_CONFIG.CHECK_URL, checkPayload);
    const data = response.data.data;
    const isSuccess = response.data.code === "00" && data.status === "ACCEPTED";

    // 3. TRAITEMENT TRANSACTIONNEL (Base de données)
    await prisma.$transaction(async (tx) => {
        // A. Retrouver le paiement en attente
        const payment = await tx.payment.findFirst({
            where: { reference: transactionId },
            include: { lease: { include: { property: true } } }
        });

        if (!payment) {
            // Si le paiement n'existe pas, on loggue et on ignore (pour ne pas bloquer CinetPay)
            console.error(`Paiement introuvable pour ref: ${transactionId}`);
            return; 
        }

        if (payment.status === "SUCCESS") {
            return; // Déjà traité (Idempotence)
        }

        if (isSuccess) {
            // B. CALCUL DES COMMISSIONS (Split)
            let platformFee = 0;
            let ownerAmount = payment.amount;

            // Logique : Commission prise uniquement sur les Loyers, pas sur les Cautions
            if (payment.type === "LOYER") {
                platformFee = Math.floor(payment.amount * PLATFORM_COMMISSION_RATE);
                ownerAmount = payment.amount - platformFee;
            }

            // C. MISE À JOUR DU PAIEMENT
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: "SUCCESS",
                    method: data.payment_method || "CINETPAY",
                    amountPlatform: platformFee,
                    amountOwner: ownerAmount,
                    // Si c'était un dépôt, on met à jour le montantCaution
                    // amountDeposit est géré implicitement si type == DEPOSIT
                }
            });

            // D. ALIMENTATION DU WALLET PROPRIÉTAIRE
            if (ownerAmount > 0) {
                await tx.user.update({
                    where: { id: payment.lease.property.ownerId },
                    data: {
                        walletBalance: { increment: ownerAmount }
                    }
                });

                // Trace comptable Owner
                await tx.transaction.create({
                    data: {
                        amount: ownerAmount,
                        type: "CREDIT",
                        reason: `Loyer reçu - ${payment.lease.property.title}`,
                        userId: payment.lease.property.ownerId
                    }
                });
            }

            // E. UPDATE BAIL (Si premier paiement, le bail devient actif)
            if (payment.lease.status === "PENDING" && payment.type === "DEPOSIT") {
                await tx.lease.update({
                    where: { id: payment.lease.id },
                    data: { 
                        status: "ACTIVE",
                        isActive: true
                    }
                });
            }

        } else {
            // F. GESTION ÉCHEC
            await tx.payment.update({
                where: { id: payment.id },
                data: { status: "FAILED" }
            });
        }
    });

    // 4. RÉPONSE À CINETPAY (Toujours 200 OK pour arrêter les relances)
    return new NextResponse("OK", { status: 200 });

  } catch (error) {
    console.error("Webhook Critical Error:", error);
    // On renvoie 200 même en cas d'erreur interne pour éviter que CinetPay ne spamme le webhook
    return new NextResponse("Webhook Handled with Error", { status: 200 });
  }
}
