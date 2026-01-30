import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { Role } from "@prisma/client";

// =============================================================================
// 🔧 CONFIGURATION & SÉCURITÉ
// =============================================================================
const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  CHECK_URL: "https://api-checkout.cinetpay.com/v2/payment/check"
};

// =============================================================================
// 💰 RÈGLES FINANCIÈRES STRICTES (Business Logic)
// =============================================================================
const FEES = {
  TENANT_ENTRANCE_FEE: 20000, 
  PLATFORM_RECURRING_RATE: 0.05, // 5%
  AGENT_SUCCESS_FEE_RATE: 0.05, // 5%
  AGENCY_DEFAULT_RATE: 0.10 // 10%
};

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let transactionId = "";

  try {
    // 1. EXTRACTION
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        transactionId = (formData.get('cpm_trans_id') || formData.get('cpm_custom')) as string;
    } else {
        const jsonBody = await request.json();
        transactionId = jsonBody.cpm_trans_id || jsonBody.cpm_custom;
    }

    if (!transactionId) return NextResponse.json({ error: "Missing Transaction ID" }, { status: 400 });

    // 2. VÉRIFICATION
    const verificationPayload = {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: transactionId
    };

    const response = await axios.post(CINETPAY_CONFIG.CHECK_URL, verificationPayload);
    const data = response.data.data;
    
    const isValidPayment = response.data.code === "00" && data.status === "ACCEPTED";
    const paymentMethod = data.payment_method || "MOBILE_MONEY";
    const amountPaid = parseInt(data.amount); 

    // 3. EXÉCUTION ATOMIQUE
    await prisma.$transaction(async (tx) => {
        
        // A. CONTEXTE
        const rentalPayment = await tx.payment.findFirst({
            where: { reference: transactionId },
            include: { lease: { include: { property: { include: { agency: true } } } } }
        });

        const investmentContract = !rentalPayment 
            ? await tx.investmentContract.findUnique({ where: { paymentReference: transactionId } })
            : null;

        // B. GESTION LOCATIVE
        if (rentalPayment) {
            if (rentalPayment.status === "SUCCESS") return;

            if (isValidPayment) {
                // DISTRIBUTION
                let platformShare = 0; 
                let agentShare = 0;    
                let agencyShare = 0;   
                let ownerShare = 0;    

                const baseRent = rentalPayment.lease.monthlyRent; 
                
                // CALCUL TAUX AGENCE
                let appliedAgencyRate = 0;
                if (rentalPayment.lease.property.agency) {
                    if (rentalPayment.lease.agencyCommissionRate) {
                        appliedAgencyRate = rentalPayment.lease.agencyCommissionRate;
                    } else if (rentalPayment.lease.property.agency.defaultCommissionRate) {
                        appliedAgencyRate = rentalPayment.lease.property.agency.defaultCommissionRate;
                    } else {
                        appliedAgencyRate = FEES.AGENCY_DEFAULT_RATE;
                    }
                }

                // SPLIT
                if (rentalPayment.type === "DEPOSIT") {
                    platformShare += FEES.TENANT_ENTRANCE_FEE;
                    platformShare += Math.floor(baseRent * FEES.PLATFORM_RECURRING_RATE);

                    if (rentalPayment.lease.agentId) {
                        agentShare = Math.floor(baseRent * FEES.AGENT_SUCCESS_FEE_RATE);
                    }
                    if (appliedAgencyRate > 0) {
                        agencyShare = Math.floor(baseRent * appliedAgencyRate);
                    }
                    ownerShare = amountPaid - platformShare - agentShare - agencyShare;

                } else if (rentalPayment.type === "LOYER") {
                    platformShare = Math.floor(amountPaid * FEES.PLATFORM_RECURRING_RATE);
                    agentShare = 0;
                    if (appliedAgencyRate > 0) {
                        agencyShare = Math.floor(amountPaid * appliedAgencyRate);
                    }
                    ownerShare = amountPaid - platformShare - agencyShare;
                }

                // UPDATES
                await tx.payment.update({
                    where: { id: rentalPayment.id },
                    data: {
                        status: "SUCCESS",
                        method: paymentMethod,
                        amountPlatform: platformShare,
                        amountAgent: agentShare,
                        amountAgency: agencyShare,
                        amountOwner: ownerShare,
                    }
                });

                // PROPRIÉTAIRE
                if (ownerShare > 0) {
                    await tx.user.update({
                        where: { id: rentalPayment.lease.property.ownerId },
                        data: { walletBalance: { increment: ownerShare } }
                    });
                    await tx.transaction.create({
                        data: {
                            amount: ownerShare,
                            type: "CREDIT",
                            reason: `LOYER_NET_${rentalPayment.lease.property.title.substring(0, 10).toUpperCase()}`,
                            status: "SUCCESS",
                            userId: rentalPayment.lease.property.ownerId
                        }
                    });
                }

                // AGENT (Uber)
                if (agentShare > 0 && rentalPayment.lease.agentId) {
                    await tx.user.update({
                        where: { id: rentalPayment.lease.agentId },
                        data: { walletBalance: { increment: agentShare } }
                    });
                    await tx.transaction.create({
                        data: {
                            amount: agentShare,
                            type: "CREDIT",
                            reason: `COM_AGENT_${rentalPayment.lease.property.title.substring(0, 10).toUpperCase()}`,
                            status: "SUCCESS",
                            userId: rentalPayment.lease.agentId
                        }
                    });
                }
                
                // ✅ AGENCE B2B (CORRECTION ICI)
                // On utilise enfin le modèle AgencyTransaction 
                if (agencyShare > 0 && rentalPayment.lease.property.agencyId) {
                    // 1. Crédit du Solde
                    await tx.agency.update({
                        where: { id: rentalPayment.lease.property.agencyId },
                        data: { walletBalance: { increment: agencyShare } }
                    });
                    
                    // 2. Trace Comptable DÉDIÉE (Plus de commentaire, du vrai code)
                    await tx.agencyTransaction.create({
                        data: {
                            amount: agencyShare,
                            type: "CREDIT",
                            reason: `COM_AGENCE_${rentalPayment.lease.property.title.substring(0, 10).toUpperCase()}`,
                            status: "SUCCESS",
                            agencyId: rentalPayment.lease.property.agencyId
                        }
                    });
                }

                // ACTIVATION BAIL
                if (rentalPayment.lease.status === "PENDING" && rentalPayment.type === "DEPOSIT") {
                    await tx.lease.update({
                        where: { id: rentalPayment.lease.id },
                        data: { status: "ACTIVE", isActive: true }
                    });
                }

            } else {
                await tx.payment.update({
                    where: { id: rentalPayment.id },
                    data: { status: "FAILED" }
                });
            }
        } 
        
        // C. INVESTISSEMENT
        else if (investmentContract) {
            if (investmentContract.status === "ACTIVE") return;

            if (isValidPayment) {
                await tx.investmentContract.update({
                    where: { id: investmentContract.id },
                    data: { status: "ACTIVE" }
                });
                await tx.user.update({
                    where: { id: investmentContract.userId },
                    data: { 
                        role: Role.INVESTOR,
                        isBacker: true,
                        backerTier: investmentContract.packName || "SUPPORTER"
                    }
                });
                await tx.transaction.create({
                    data: {
                        amount: amountPaid,
                        type: "DEBIT", 
                        reason: `INVESTISSEMENT_PACK_${(investmentContract.packName || 'STANDARD').toUpperCase()}`,
                        status: "SUCCESS",
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
    });

    return new NextResponse("OK", { status: 200 });

  } catch (error: any) {
    console.error(`[Webhook Fatal Error] Tx: ${transactionId}`, error);
    return new NextResponse("Error Handled", { status: 200 });
  }
}
