import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { Role } from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";
import { sendNotification } from "@/lib/notifications";
import * as Sentry from "@sentry/nextjs"; 
import { logActivity } from "@/lib/logger"; // ✅ 1. IMPORT DU LOGGER

// =============================================================================
// 🔧 CONFIGURATION & SÉCURITÉ (BANK-GRADE)
// =============================================================================
const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  SECRET_KEY: process.env.CINETPAY_SECRET_KEY, 
  CHECK_URL: "https://api-checkout.cinetpay.com/v2/payment/check"
};

const FEES = {
  TENANT_ENTRANCE_FEE: 20000, 
  PLATFORM_RECURRING_RATE: 0.05,
  AGENT_SUCCESS_FEE_RATE: 0.05,
  AGENCY_DEFAULT_RATE: 0.10 
};

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let transactionId = "";
  // On récupère le corps brut pour la validation de signature
  const rawBody = await request.text(); 

  try {
    // ====================================================
    // 1. SÉCURITÉ PÉRIMÉTRIQUE (ZERO TRUST) 🛡️
    // ====================================================
    
    // A. Présence Obligatoire de la Signature
    const signatureHeader = request.headers.get("x-cinetpay-signature");
    
    if (!signatureHeader) {
        console.error("🚨 Security Alert: Missing Signature Header from CinetPay");
        return new NextResponse("Unauthorized: Missing Signature", { status: 401 });
    }

    // B. Validation Cryptographique (HMAC - Timing Safe)
    if (CINETPAY_CONFIG.SECRET_KEY) {
        const expectedSignature = createHmac("sha256", CINETPAY_CONFIG.SECRET_KEY)
          .update(rawBody)
          .digest("hex");

        const sigBuffer = Buffer.from(signatureHeader);
        const expectedBuffer = Buffer.from(expectedSignature);

        if (sigBuffer.length !== expectedBuffer.length) {
             console.error("🚨 Security Alert: Signature Length Mismatch");
             return new NextResponse("Unauthorized: Invalid Signature", { status: 401 });
        }

        const valid = timingSafeEqual(sigBuffer, expectedBuffer);

        if (!valid) {
            console.error("🚨 Critical: Invalid Webhook Signature Attempt");
            return new NextResponse("Unauthorized: Invalid Signature", { status: 401 });
        }
    }

    // ====================================================
    // 2. EXTRACTION DES DONNÉES
    // ====================================================
    let body;
    try {
        body = JSON.parse(rawBody);
    } catch (e) {
        const params = new URLSearchParams(rawBody);
        body = Object.fromEntries(params.entries());
    }
    
    transactionId = body.cpm_trans_id || body.cpm_custom;

    if (!transactionId) {
        return NextResponse.json({ error: "Missing Transaction ID" }, { status: 400 });
    }

    // ====================================================
    // 3. DOUBLE VÉRIFICATION CÔTÉ FOURNISSEUR (API CHECK)
    // ====================================================
    const verification = await axios.post(CINETPAY_CONFIG.CHECK_URL, {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: transactionId
    });

    const apiData = verification.data.data;
    const isValidPayment = verification.data.code === "00" && apiData.status === "ACCEPTED";
    const amountPaid = parseInt(apiData.amount); 

    // ====================================================
    // 4. EXÉCUTION ATOMIQUE (PRISMA TRANSACTION)
    // ====================================================
    await prisma.$transaction(async (tx) => {
        
        // A. RECHERCHE ET VERROUILLAGE
        const paymentRecord = await tx.payment.findUnique({
            where: { reference: transactionId },
            include: { 
                lease: { include: { property: { include: { agency: true } } } },
                quote: { include: { artisan: true } } 
            }
        });

        const investmentContract = !paymentRecord 
            ? await tx.investmentContract.findUnique({ where: { paymentReference: transactionId } })
            : null;

        const bookingPayment = (!paymentRecord && !investmentContract)
            ? await tx.bookingPayment.findUnique({ where: { transactionId: transactionId } })
            : null;


        // B. ROUTAGE SELON LE TYPE DE PAIEMENT

        // --- CAS 1 : PAIEMENT IMMO STANDARD ---
        if (paymentRecord) {
            if (paymentRecord.status === "SUCCESS") return;

            if (isValidPayment && amountPaid !== paymentRecord.amount) {
                console.error(`Fraud Alert: Amount mismatch for Tx ${transactionId}`);
                await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: "FAILED" } });
                throw new Error("Security Breach: Payment amount integrity failure");
            }

            if (isValidPayment) {
                if (paymentRecord.lease) {
                    let platformShare = 0, agentShare = 0, agencyShare = 0, ownerShare = 0;
                    const baseRent = paymentRecord.lease.monthlyRent;
                    const appliedAgencyRate = paymentRecord.lease.agencyCommissionRate || FEES.AGENCY_DEFAULT_RATE;

                    if (paymentRecord.type === "DEPOSIT") {
                        platformShare = FEES.TENANT_ENTRANCE_FEE + Math.floor(baseRent * FEES.PLATFORM_RECURRING_RATE);
                        if (paymentRecord.lease.agentId) agentShare = Math.floor(baseRent * FEES.AGENT_SUCCESS_FEE_RATE);
                        if (paymentRecord.lease.property.agencyId) agencyShare = Math.floor(baseRent * appliedAgencyRate);
                        ownerShare = amountPaid - platformShare - agentShare - agencyShare;
                    } else {
                        platformShare = Math.floor(amountPaid * FEES.PLATFORM_RECURRING_RATE);
                        if (paymentRecord.lease.property.agencyId) agencyShare = Math.floor(amountPaid * appliedAgencyRate);
                        ownerShare = amountPaid - platformShare - agencyShare;
                    }

                    const ownerId = paymentRecord.lease.property.ownerId;
                    const ownerFinance = await tx.userFinance.findUnique({ where: { userId: ownerId } });
                    if (!ownerFinance) {
                        await tx.userFinance.create({ data: { userId: ownerId, walletBalance: ownerShare, version: 1 } });
                    } else {
                        await tx.userFinance.update({ where: { userId: ownerId }, data: { walletBalance: { increment: ownerShare } } });
                    }

                    if (paymentRecord.lease.status === "PENDING" && paymentRecord.type === "DEPOSIT") {
                        await tx.lease.update({ where: { id: paymentRecord.lease.id }, data: { status: "ACTIVE", isActive: true } });
                    }
                    
                    await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: "SUCCESS", method: apiData.payment_method || "UNKNOWN", providerResponse: apiData as any } });
                    
                    // ✅ AUDIT LOG (Optionnel pour Loyer)
                    await logActivity({
                        action: "PAYMENT_SUCCESS",
                        entityId: transactionId,
                        entityType: "PAYMENT",
                        userId: ownerId, // Crédité
                        metadata: { amount: amountPaid, type: "LEASE_RENT", provider: "CINETPAY" }
                    });

                } else if (paymentRecord.quote) {
                    await tx.quote.update({ where: { id: paymentRecord.quoteId! }, data: { status: 'PAID' } });
                    await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: "SUCCESS" } });
                    
                     const artisanId = paymentRecord.quote.artisanId;
                     const artisanFinance = await tx.userFinance.findUnique({ where: { userId: artisanId } });
                     if (!artisanFinance) {
                        await tx.userFinance.create({ data: { userId: artisanId, walletBalance: paymentRecord.amount, version: 1 } });
                     } else {
                        await tx.userFinance.update({ where: { userId: artisanId }, data: { walletBalance: { increment: paymentRecord.amount } } });
                     }
                }
            } else {
                await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: "FAILED" } });
            }
        } 
        
        // --- CAS 2 : INVESTISSEMENT ---
        else if (investmentContract) {
             if (investmentContract.status === "ACTIVE") return;
             if (isValidPayment) {
                 await tx.investmentContract.update({ where: { id: investmentContract.id }, data: { status: "ACTIVE" } });
                 await tx.user.update({ where: { id: investmentContract.userId }, data: { role: Role.INVESTOR, isBacker: true } });
             } else {
                 await tx.investmentContract.update({ where: { id: investmentContract.id }, data: { status: "FAILED" } });
             }
        }

        // --- CAS 3 : RÉSERVATION AKWABA ---
        else if (bookingPayment) {
            if (bookingPayment.status === "SUCCESS") return;

            if (isValidPayment) {
                if (amountPaid !== bookingPayment.amount) {
                     console.error(`Fraud Alert Akwaba: Amount mismatch ${transactionId}`);
                     await tx.bookingPayment.update({ where: { id: bookingPayment.id }, data: { status: "FAILED" } });
                     return; 
                }

                // 1. Mise à jour du Paiement
                await tx.bookingPayment.update({
                    where: { id: bookingPayment.id },
                    data: {
                        status: "SUCCESS",
                        provider: apiData.payment_method || "CINETPAY", 
                        agencyCommission: Math.round(amountPaid * 0.10),
                        hostPayout: Math.round(amountPaid * 0.90)
                    }
                });

                // 2. Mise à jour de la Réservation
                await tx.booking.update({
                    where: { id: bookingPayment.bookingId },
                    data: { status: "PAID" }
                });

                // 3. Créditer le Hôte
                const bookingData = await tx.booking.findUnique({ 
                    where: { id: bookingPayment.bookingId }, 
                    select: { 
                        guestId: true, 
                        listing: { select: { title: true, hostId: true } } 
                    } 
                });
                
                if (bookingData?.listing?.hostId) {
                    const hostId = bookingData.listing.hostId;
                    const payout = Math.round(amountPaid * 0.90);

                    // A. Upsert Wallet
                    const hostFinance = await tx.userFinance.findUnique({ where: { userId: hostId } });
                    if (!hostFinance) {
                        await tx.userFinance.create({ data: { userId: hostId, walletBalance: payout, version: 1 } });
                    } else {
                        await tx.userFinance.update({ where: { userId: hostId }, data: { walletBalance: { increment: payout } } });
                    }
                    
                    // B. Log Transaction (Pour l'affichage Dashboard)
                    await tx.transaction.create({
                        data: {
                            amount: payout,
                            type: 'CREDIT', 
                            status: 'SUCCESS',
                            reason: `Réservation Akwaba #${bookingPayment.bookingId}`,
                            userId: hostId,
                            reference: `AKW-${transactionId}`,
                            balanceType: 'WALLET'
                        }
                    });

                    // C. ENVOI DES NOTIFICATIONS 🔔
                    await sendNotification({
                        userId: bookingData.guestId,
                        title: "Réservation Confirmée ! 🎒",
                        message: `Votre paiement pour "${bookingData.listing.title}" a bien été reçu.`,
                        type: "SUCCESS",
                        link: `/dashboard/tenant/bookings/${bookingPayment.bookingId}`
                    });

                    await sendNotification({
                        userId: hostId,
                        title: "Nouvelle Réservation ! 🏠",
                        message: `Vous avez reçu une réservation payée pour "${bookingData.listing.title}".`,
                        type: "INFO",
                        link: `/dashboard/host/bookings/${bookingPayment.bookingId}`
                    });

                    // D. AUDIT LOG (Mouchard Financier Indépendant) ✅
                    // Ici userId est celui du bénéficiaire (Host)
                    await logActivity({
                        action: "PAYMENT_SUCCESS",
                        entityId: transactionId,
                        entityType: "PAYMENT",
                        userId: hostId, 
                        metadata: {
                            amount: amountPaid,
                            provider: "CINETPAY",
                            bookingId: bookingPayment.bookingId,
                            payerId: bookingData.guestId
                        }
                    });
                }
            } else {
                 await tx.bookingPayment.update({
                    where: { id: bookingPayment.id },
                    data: { status: "FAILED" }
                });
            }
        }

    }, {
        isolationLevel: "Serializable",
        maxWait: 10000,
        timeout: 20000
    });

    return new NextResponse("OK", { status: 200 });

  } catch (error: any) {
  
    console.error(`[Fatal Webhook Error] Tx: ${transactionId}`, error.message);
    
    Sentry.captureException(error, {
        tags: {
            source: "webhook_cinetpay",
            transaction_id: transactionId
        },
        extra: {
            raw_body_snippet: rawBody?.substring(0, 200) 
        }
    });

    // On renvoie 200 pour que CinetPay arrête de spammer
    return new NextResponse("Processed with error", { status: 200 });
  }
}
