import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { Role } from "@prisma/client";
import { createHmac } from "crypto";

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
  const rawBody = await request.text(); 

  try {
    // 1. AUTHENTIFICATION DE LA SOURCE (HMAC SHA256)
    const signature = request.headers.get("x-cinetpay-signature");
    if (CINETPAY_CONFIG.SECRET_KEY && signature) {
        const expectedSignature = createHmac("sha256", CINETPAY_CONFIG.SECRET_KEY)
          .update(rawBody)
          .digest("hex");

        if (signature !== expectedSignature) {
            console.error("Critical: Invalid Webhook Signature Attempt");
            return new NextResponse("Unauthorized", { status: 401 });
        }
    }

    // 2. EXTRACTION DES DONNÉES
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

    // 3. DOUBLE VÉRIFICATION CÔTÉ FOURNISSEUR (API CHECK)
    const verification = await axios.post(CINETPAY_CONFIG.CHECK_URL, {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: transactionId
    });

    const apiData = verification.data.data;
    const isValidPayment = verification.data.code === "00" && apiData.status === "ACCEPTED";
    const amountPaid = parseInt(apiData.amount); 

    // 4. EXÉCUTION ATOMIQUE AVEC ISOLATION SÉRIALISABLE
    await prisma.$transaction(async (tx) => {
        
        // A. RECHERCHE ET VERROUILLAGE (Tous les types possibles)
        // 1. Paiement Standard (Loyer, Devis...)
        const paymentRecord = await tx.payment.findUnique({
            where: { reference: transactionId },
            include: { 
                lease: { include: { property: { include: { agency: true } } } },
                quote: { include: { artisan: true } } 
            }
        });

        // 2. Investissement
        const investmentContract = !paymentRecord 
            ? await tx.investmentContract.findUnique({ where: { paymentReference: transactionId } })
            : null;

        // 3. Réservation Akwaba (NOUVEAU 👇)
        const bookingPayment = (!paymentRecord && !investmentContract)
            ? await tx.bookingPayment.findUnique({ where: { transactionId: transactionId } })
            : null;


        // B. ROUTAGE SELON LE TYPE DE PAIEMENT TROUVÉ

        // --- CAS 1 : PAIEMENT IMMO STANDARD (LOYER, CHARGES, DEVIS) ---
        if (paymentRecord) {
            if (paymentRecord.status === "SUCCESS") return; // Idempotence

            if (isValidPayment && amountPaid !== paymentRecord.amount) {
                console.error(`Fraud Alert: Amount mismatch for Tx ${transactionId}`);
                await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: "FAILED" } });
                throw new Error("Security Breach: Payment amount integrity failure");
            }

            if (isValidPayment) {
                // Logique Loyer
                if (paymentRecord.lease) {
                    // ... (Ta logique existante pour les loyers) ...
                    // Je reprends ton code exact pour ne rien casser
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

                    // Upsert Owner Wallet
                    const ownerId = paymentRecord.lease.property.ownerId;
                    const ownerFinance = await tx.userFinance.findUnique({ where: { userId: ownerId } });
                    if (!ownerFinance) {
                        await tx.userFinance.create({ data: { userId: ownerId, walletBalance: ownerShare, version: 1 } });
                    } else {
                        await tx.userFinance.update({ where: { userId: ownerId }, data: { walletBalance: { increment: ownerShare } } });
                    }

                    // Activation Bail
                    if (paymentRecord.lease.status === "PENDING" && paymentRecord.type === "DEPOSIT") {
                        await tx.lease.update({ where: { id: paymentRecord.lease.id }, data: { status: "ACTIVE", isActive: true } });
                    }
                    
                    // Update Payment
                    await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: "SUCCESS", method: apiData.payment_method || "UNKNOWN", providerResponse: apiData as any } });

                } 
                // Logique Devis
                else if (paymentRecord.quote) {
                    await tx.quote.update({ where: { id: paymentRecord.quoteId! }, data: { status: 'PAID' } });
                    await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: "SUCCESS" } });
                    
                    // Créditer l'artisan
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

        // --- CAS 3 : RÉSERVATION AKWABA (NOUVEAU BLOQUE AJOUTÉ ICI) ---
        else if (bookingPayment) {
            // Idempotence
            if (bookingPayment.status === "SUCCESS") return; 

            if (isValidPayment) {
                // Vérification Montant
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
                        provider: apiData.payment_method || "CINETPAY", // ex: OMM, MOMO
                        agencyCommission: Math.round(amountPaid * 0.10), // Exemple 10%
                        hostPayout: Math.round(amountPaid * 0.90)
                    }
                });

                // 2. Mise à jour de la Réservation
                await tx.booking.update({
                    where: { id: bookingPayment.bookingId },
                    data: { status: "PAID" }
                });

                // 3. Créditer le Hôte (Wallet)
                // On récupère le booking pour avoir l'hôte
                const booking = await tx.booking.findUnique({ 
                    where: { id: bookingPayment.bookingId }, 
                    select: { listing: { select: { hostId: true } } } 
                });
                
                if (booking?.listing?.hostId) {
                    const hostId = booking.listing.hostId;
                    const payout = Math.round(amountPaid * 0.90);

                    // Upsert Wallet Hôte
                    const hostFinance = await tx.userFinance.findUnique({ where: { userId: hostId } });
                    if (!hostFinance) {
                        await tx.userFinance.create({ data: { userId: hostId, walletBalance: payout, version: 1 } });
                    } else {
                        await tx.userFinance.update({ where: { userId: hostId }, data: { walletBalance: { increment: payout } } });
                    }
                    
                    // Transaction Log (Pour l'historique du Dashboard Hôte)
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
    return new NextResponse("Processed with error", { status: 200 });
  }
}
