import { NextResponse } from "next/server";
import { auth } from "@/auth";

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
    // Note: CinetPay renvoie "00" pour succès
    const isValidPayment = verification.data.code === "00" && apiData.status === "ACCEPTED";
    const amountPaid = parseInt(apiData.amount); 

    // 4. EXÉCUTION ATOMIQUE AVEC ISOLATION SÉRIALISABLE
    await prisma.$transaction(async (tx) => {
        
        // A. RECHERCHE ET VERROUILLAGE
        const paymentRecord = await tx.payment.findUnique({
            where: { reference: transactionId },
            include: { 
                lease: { include: { property: { include: { agency: true } } } },
                quote: { include: { artisan: true } } // On inclut l'artisan pour le scénario devis
            }
        });

        const investmentContract = !paymentRecord 
            ? await tx.investmentContract.findUnique({ where: { paymentReference: transactionId } })
            : null;

        // B. SCÉNARIO 1 : GESTION DES PAIEMENTS STANDARDS
        if (paymentRecord) {
            
            // Idempotence
            if (paymentRecord.status === "SUCCESS") return;

            // Anti-Fraude Montant
            if (isValidPayment && amountPaid !== paymentRecord.amount) {
                console.error(`Fraud Alert: Amount mismatch for Tx ${transactionId}`);
                await tx.payment.update({
                    where: { id: paymentRecord.id },
                    data: { status: "FAILED" }
                });
                throw new Error("Security Breach: Payment amount integrity failure");
            }

            if (isValidPayment) {
                
                // --- SCÉNARIO 1.1 : PAIEMENT LOCATIF (RENT/DEPOSIT) ---
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

                    // 1. Mise à jour Wallet Propriétaire (Upsert)
                    const ownerId = paymentRecord.lease.property.ownerId;
                    const ownerFinance = await tx.userFinance.findUnique({ where: { userId: ownerId } });

                    if (!ownerFinance) {
                        await tx.userFinance.create({
                            data: { userId: ownerId, walletBalance: ownerShare, version: 1 }
                        });
                    } else {
                        await tx.userFinance.update({
                            where: { userId: ownerId, version: ownerFinance.version },
                            data: { walletBalance: { increment: ownerShare }, version: { increment: 1 } }
                        });
                    }

                    // 2. Activation Bail
                    if (paymentRecord.lease.status === "PENDING" && paymentRecord.type === "DEPOSIT") {
                        await tx.lease.update({ where: { id: paymentRecord.lease.id }, data: { status: "ACTIVE", isActive: true } });
                    }

                    // ✅ 3. [AJOUT CRITIQUE] CRÉATION DU LOG D'AUDIT (Pour SuperAdmin)
                    // C'est ce qui manquait pour remplir ton tableau
                    await tx.transaction.create({
                        data: {
                            amount: amountPaid,
                            type: 'PAYMENT', 
                            status: 'SUCCESS',
                            reason: `Encaissement Loyer ${paymentRecord.lease.id}`,
                            userId: paymentRecord.lease.tenantId, // Le locataire a payé
                            reference: transactionId,
                            balanceType: 'WALLET',
                            propertyId: paymentRecord.lease.propertyId 
                        }
                    });
                }

                // --- SCÉNARIO 1.2 : RECHARGEMENT WALLET (TOPUP) ---
                else if (paymentRecord.type === 'TOPUP' || paymentRecord.type === 'CHARGES') { 
                    // Logique existante (déjà correcte)
                    let userIdToCredit = null;
                    if (apiData.metadata) {
                        try {
                            const meta = typeof apiData.metadata === 'string' ? JSON.parse(apiData.metadata) : apiData.metadata;
                            userIdToCredit = meta.userId;
                        } catch (e) {}
                    }

                    if (userIdToCredit) {
                         const userFinance = await tx.userFinance.findUnique({ where: { userId: userIdToCredit } });
                         if (!userFinance) {
                             await tx.userFinance.create({ data: { userId: userIdToCredit, walletBalance: amountPaid, version: 1 } });
                         } else {
                             await tx.userFinance.update({ where: { userId: userIdToCredit, version: userFinance.version }, data: { walletBalance: { increment: amountPaid }, version: { increment: 1 } } });
                         }
                         
                         await tx.transaction.create({
                             data: {
                                 amount: amountPaid,
                                 type: "CREDIT",
                                 balanceType: "WALLET",
                                 reason: "Rechargement via CinetPay",
                                 status: "SUCCESS",
                                 reference: `TOPUP-${transactionId}`,
                                 userId: userIdToCredit
                             }
                         });
                    }
                }

                // --- SCÉNARIO 1.3 : PAIEMENT DEVIS (QUOTE) ---
                else if (paymentRecord.quote) {
                    await tx.quote.update({ where: { id: paymentRecord.quoteId! }, data: { status: 'PAID' } });

                    const artisanId = paymentRecord.quote.artisanId;
                    const artisanNetIncome = paymentRecord.amount; // Ou calcul spécifique si commission

                    const artisanFinance = await tx.userFinance.findUnique({ where: { userId: artisanId } });

                    if (!artisanFinance) {
                        await tx.userFinance.create({ data: { userId: artisanId, walletBalance: artisanNetIncome, version: 1 } });
                    } else {
                        await tx.userFinance.update({ where: { userId: artisanId, version: artisanFinance.version }, data: { walletBalance: { increment: artisanNetIncome }, version: { increment: 1 } } });
                    }

                    await tx.transaction.create({
                        data: {
                            amount: artisanNetIncome,
                            type: "CREDIT",
                            balanceType: "WALLET",
                            reason: `Paiement Devis #${paymentRecord.quote.number}`,
                            status: "SUCCESS",
                            reference: `QUOTE-${transactionId}`,
                            userId: artisanId,
                            quoteId: paymentRecord.quoteId
                        }
                    });
                }

                // UPDATE FINAL PAIEMENT
                await tx.payment.update({
                    where: { id: paymentRecord.id },
                    data: {
                        status: "SUCCESS",
                        method: apiData.payment_method || "UNKNOWN",
                        providerResponse: apiData as any 
                    }
                });

            } else {
                await tx.payment.update({
                    where: { id: paymentRecord.id },
                    data: { status: "FAILED", providerResponse: apiData as any }
                });
            }
        } 
        
        // C. SCÉNARIO 2 : INVESTISSEMENT (Legacy)
        else if (investmentContract) {
            if (investmentContract.status === "ACTIVE") return;

            if (isValidPayment) {
                if (amountPaid !== investmentContract.amount) throw new Error("Investment amount mismatch");

                await tx.investmentContract.update({
                    where: { id: investmentContract.id },
                    data: { status: "ACTIVE" }
                });

                await tx.user.update({
                    where: { id: investmentContract.userId },
                    data: { role: Role.INVESTOR, isBacker: true, backerTier: investmentContract.packName || "SUPPORTER" }
                });
                
                // AJOUT : Log pour investissement aussi
                await tx.transaction.create({
                    data: {
                        amount: amountPaid,
                        type: "INVESTMENT",
                        balanceType: "WALLET",
                        reason: `Investissement ${investmentContract.packName}`,
                        status: "SUCCESS",
                        reference: `INVEST-${transactionId}`,
                        userId: investmentContract.userId
                    }
                });
                
            } else {
                 await tx.investmentContract.update({
                    where: { id: investmentContract.id },
                    data: { status: "FAILED" }
                });
            }
        }
    }, {
        isolationLevel: "Serializable",
        maxWait: 10000, // Timeout augmenté pour éviter les erreurs de lock
        timeout: 20000
    });

    return new NextResponse("OK", { status: 200 });

  } catch (error: any) {
    console.error(`[Fatal Webhook Error] Tx: ${transactionId}`, error.message);
    return new NextResponse("Processed with error", { status: 200 });
  }
}
