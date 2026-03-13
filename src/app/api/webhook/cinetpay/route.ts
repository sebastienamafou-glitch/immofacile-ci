import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
    Role, 
    Prisma, 
    InvestmentContract, 
    BookingPayment, 
    TransactionType, 
    BalanceType, 
    PaymentStatus,
    LeaseStatus, // ✅ Importation de l'Enum
    BookingStatus // ✅ Importation de l'Enum
} from "@prisma/client";
import axios from "axios";
import { createHmac, timingSafeEqual } from "crypto";
import { sendNotification } from "@/lib/notifications";
import * as Sentry from "@sentry/nextjs";
import { logActivity } from "@/lib/logger";
import { z } from "zod";

// =============================================================================
// 🔧 CONFIGURATION & SÉCURITÉ
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

// =============================================================================
// 🛡️ TYPAGE STRICT (Basé sur le Schema Prisma)
// =============================================================================
type TxClient = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    lease: { include: { property: { include: { agency: true } } } },
    quote: { include: { artisan: true } }
  }
}>;

interface CinetPayApiData {
    payment_method?: string;
    status?: string;
    amount?: string;
    [key: string]: unknown;
}

// =============================================================================
// 🚀 WEBHOOK HANDLER
// =============================================================================
export async function POST(request: Request) {
  let transactionId = "";
  const rawBody = await request.text();

  try {
    // 1. SÉCURITÉ PÉRIMÉTRIQUE
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

    // 2. EXTRACTION DES DONNÉES
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      body = Object.fromEntries(new URLSearchParams(rawBody).entries());
    }

    transactionId = String(body.cpm_trans_id || body.cpm_custom || "");
    if (!transactionId) return NextResponse.json({ error: "Missing Transaction ID" }, { status: 400 });

    const verification = await axios.post(CINETPAY_CONFIG.CHECK_URL, {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: transactionId
    });

    const apiData = verification.data.data as CinetPayApiData;
    const isValidPayment = verification.data.code === "00" && apiData.status === "ACCEPTED";
    const amountPaid = parseInt(apiData.amount || "0", 10);
    
    const postTransactionActions: Array<() => Promise<void>> = [];

    // 3. EXÉCUTION ATOMIQUE
    await prisma.$transaction(async (tx) => {

      const paymentRecord = await tx.payment.findUnique({
        where: { reference: transactionId },
        include: {
          lease: { include: { property: { include: { agency: true } } } },
          quote: { include: { artisan: true } }
        }
      });

      const investmentContract = !paymentRecord ? await tx.investmentContract.findUnique({ where: { paymentReference: transactionId } }) : null;
      const bookingPayment = (!paymentRecord && !investmentContract) ? await tx.bookingPayment.findUnique({ where: { transactionId: transactionId } }) : null;

      if (paymentRecord) {
        await processRealEstatePayment(tx, paymentRecord, isValidPayment, amountPaid, transactionId, apiData, body);
      } else if (investmentContract) {
        await processInvestmentPayment(tx, investmentContract, isValidPayment, amountPaid, transactionId);
      } else if (bookingPayment) {
        await processAkwabaPayment(tx, bookingPayment, isValidPayment, amountPaid, transactionId, apiData, postTransactionActions);
      }

    }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });

    // 4. EXÉCUTION DES EFFETS DE BORD
    for (const action of postTransactionActions) {
        await action().catch(err => console.error("Erreur Post-Transaction Action:", err));
    }

    return new NextResponse("OK", { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error(`[Fatal Webhook Error] Tx: ${transactionId}`, errorMessage);
    Sentry.captureException(error, { tags: { source: "webhook_cinetpay", transaction_id: transactionId }});
    return new NextResponse("Internal Server Error - Retry Later", { status: 500 });
  }
}

// =============================================================================
// 🧱 SOUS-SERVICES DE TRAITEMENT
// =============================================================================

async function processRealEstatePayment(tx: TxClient, paymentRecord: PaymentWithRelations, isValidPayment: boolean, amountPaid: number, transactionId: string, apiData: CinetPayApiData, body: Record<string, unknown>) {
    if (paymentRecord.status === PaymentStatus.SUCCESS) return;

    if (!isValidPayment) {
        await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: PaymentStatus.FAILED } });
        return;
    }

    if (amountPaid !== paymentRecord.amount) {
        await tx.payment.update({ 
            where: { id: paymentRecord.id }, 
            data: { 
                status: PaymentStatus.FAILED, 
                providerResponse: { ...apiData, error: "AMOUNT_MISMATCH_REJECTED" } as Prisma.InputJsonValue 
            }
        });
        return;
    }

    const lease = paymentRecord.lease;
    const property = lease?.property;

    if (lease && property) {
        let platformShare = 0, agentShare = 0, agencyShare = 0, ownerShare = 0;
        const baseRent = lease.monthlyRent;
        const appliedAgencyRate = lease.agencyCommissionRate || FEES.AGENCY_DEFAULT_RATE;

        if (paymentRecord.type === "DEPOSIT") {
            platformShare = FEES.TENANT_ENTRANCE_FEE + Math.floor(baseRent * FEES.PLATFORM_RECURRING_RATE);
            if (lease.agentId) agentShare = Math.floor(baseRent * FEES.AGENT_SUCCESS_FEE_RATE);
            if (property.agencyId) agencyShare = Math.floor(baseRent * appliedAgencyRate);
            ownerShare = amountPaid - platformShare - agentShare - agencyShare;
        } else {
            platformShare = Math.floor(amountPaid * FEES.PLATFORM_RECURRING_RATE);
            if (property.agencyId) agencyShare = Math.floor(amountPaid * appliedAgencyRate);
            ownerShare = amountPaid - platformShare - agencyShare;
        }

        const ownerId = property.ownerId;
        await tx.user.update({ where: { id: ownerId }, data: { walletBalance: { increment: ownerShare } } });
        await tx.transaction.create({ data: { amount: ownerShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Loyer/Caution (Net) - ${property.title}`, userId: ownerId, reference: `OWNER-${transactionId}`, balanceType: BalanceType.WALLET, previousHash: "GENESIS" } });

        const agency = property.agency;
        if (agency && agencyShare > 0) {
            await tx.agency.update({ where: { id: agency.id }, data: { walletBalance: { increment: agencyShare } } });
            await tx.agencyTransaction.create({ data: { amount: agencyShare, type: 'CREDIT', status: 'SUCCESS', reason: `Commission Agence - ${property.title}`, agencyId: agency.id } });
        }

        const agentId = lease.agentId;
        if (agentId && agentShare > 0) {
            await tx.user.update({ where: { id: agentId }, data: { walletBalance: { increment: agentShare } } });
            await tx.transaction.create({ data: { amount: agentShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Commission Agent - ${property.title}`, userId: agentId, reference: `AGT-${transactionId}`, balanceType: BalanceType.WALLET, previousHash: "GENESIS" } });
        }

        if (platformShare > 0) {
            const superAdmin = await tx.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
            if (superAdmin) {
                await tx.user.update({ where: { id: superAdmin.id }, data: { walletBalance: { increment: platformShare } } });
                await tx.transaction.create({ data: { amount: platformShare, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Frais Plateforme - ${transactionId}`, userId: superAdmin.id, reference: `PLAT-${transactionId}`, balanceType: BalanceType.WALLET, previousHash: "GENESIS" } });
            }
        }

        // ✅ CORRECTION TS : Utilisation de l'Enum LeaseStatus au lieu du string "ACTIVE"
        if (lease.status === LeaseStatus.PENDING && paymentRecord.type === "DEPOSIT") {
            await tx.lease.update({ where: { id: lease.id }, data: { status: LeaseStatus.ACTIVE, isActive: true } });
        }

        await tx.payment.update({ 
            where: { id: paymentRecord.id }, 
            data: { 
                status: PaymentStatus.SUCCESS, 
                method: apiData.payment_method || "UNKNOWN", 
                providerResponse: apiData as Prisma.InputJsonValue,
                amountOwner: ownerShare,
                amountPlatform: platformShare,
                amountAgent: agentShare,
                amountAgency: agencyShare
            } 
        });

        // ✅ CORRECTION TS : bypass strict type pour le logger manquant
        await logActivity({ action: "PAYMENT_SUCCESS" as any, entityId: transactionId, entityType: "PAYMENT", userId: ownerId, metadata: { amount: amountPaid, type: "LEASE_RENT" } });
    }
    else if (paymentRecord.quote && paymentRecord.quoteId) {
        await tx.quote.update({ where: { id: paymentRecord.quoteId }, data: { status: 'PAID' } });
        await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: PaymentStatus.SUCCESS } });

        const artisanId = paymentRecord.quote.artisanId;
        await tx.user.update({ where: { id: artisanId }, data: { walletBalance: { increment: paymentRecord.amount } } });
        await tx.transaction.create({ data: { amount: paymentRecord.amount, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Paiement du devis #${paymentRecord.quote.number}`, userId: artisanId, quoteId: paymentRecord.quoteId, reference: `QUOTE-${transactionId}`, balanceType: BalanceType.WALLET, previousHash: "GENESIS" } });
    }
    else if (paymentRecord.type === "TOPUP" || paymentRecord.type === "CHARGES") {
        
        const targetUserId = paymentRecord.userId;

        if (targetUserId) {
            await tx.user.update({ where: { id: targetUserId }, data: { walletBalance: { increment: paymentRecord.amount } } });
            await tx.transaction.create({ data: { userId: targetUserId, amount: paymentRecord.amount, type: TransactionType.CREDIT, balanceType: BalanceType.WALLET, status: 'SUCCESS', reason: "Rechargement", reference: `TOPUP-${transactionId}`, previousHash: "GENESIS" } });
            await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: PaymentStatus.SUCCESS, method: apiData.payment_method || "UNKNOWN" } });
        } else {
            console.error(`[Alerte TopUp] Paiement ${paymentRecord.id} orphelin. Aucun userId attaché.`);
            await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: PaymentStatus.FAILED } });
        }
    }
}

async function processInvestmentPayment(
    tx: TxClient, 
    investmentContract: InvestmentContract, 
    isValidPayment: boolean, 
    amountPaid: number, 
    transactionId: string
) {
    if (investmentContract.status === "ACTIVE" || investmentContract.status === "SUCCESS") return;

    if (!isValidPayment) {
        await tx.investmentContract.update({ 
            where: { id: investmentContract.id }, 
            data: { status: "FAILED" } 
        });
        return;
    }

    if (amountPaid !== investmentContract.amount) {
        console.error(`🚨 [Alerte Fraude] Investissement ${investmentContract.id} : attendu ${investmentContract.amount}, reçu ${amountPaid}`);
        await tx.investmentContract.update({ 
            where: { id: investmentContract.id }, 
            data: { status: "FAILED" } 
        });
        return;
    }

    await tx.investmentContract.update({ 
        where: { id: investmentContract.id }, 
        data: { status: "SUCCESS" } 
    });

    // ✅ CORRECTION TS : On force TS à comprendre que cette variable peut prendre N'IMPORTE QUELLE valeur de l'Enum Role
    let newRole: Role = Role.GUEST; 
    let isPremium = false;
    
    if (amountPaid >= 500000) {
        newRole = Role.INVESTOR; 
        isPremium = true;
    } else if (amountPaid >= 50000) {
        newRole = Role.AMBASSADOR; 
        isPremium = true;
    } else {
        newRole = Role.GUEST; 
    }

    await tx.user.update({ 
        where: { id: investmentContract.userId }, 
        data: { 
            role: newRole, 
            isBacker: true,
            isPremium: isPremium
        } 
    });

    // ✅ CORRECTION TS : bypass strict type pour le logger manquant
    await logActivity({ 
        action: "CROWDFUNDING_SUCCESS" as any, 
        entityId: transactionId, 
        entityType: "INVESTMENT", 
        userId: investmentContract.userId, 
        metadata: { amount: amountPaid, tier: newRole } 
    });
}

async function processAkwabaPayment(tx: TxClient, bookingPayment: BookingPayment, isValidPayment: boolean, amountPaid: number, transactionId: string, apiData: CinetPayApiData, postActions: Array<() => Promise<void>>) {
    if (bookingPayment.status === "SUCCESS") return;

    const bookingData = await tx.booking.findUnique({ where: { id: bookingPayment.bookingId }, include: { listing: { select: { title: true, hostId: true } } } });

    if (!bookingData || !bookingData.listing) {
        await tx.bookingPayment.update({ where: { id: bookingPayment.id }, data: { status: "FAILED_DATA_ERROR" } });
        return;
    }

    if (isValidPayment) {
        if (amountPaid !== bookingPayment.amount) {
            await tx.bookingPayment.update({ where: { id: bookingPayment.id }, data: { status: "FAILED_AMOUNT_MISMATCH" } });
            return;
        }

        const platformFee = Math.round(amountPaid * 0.10);
        const hostPayout = amountPaid - platformFee;
        const hostId = bookingData.listing.hostId;

        await tx.bookingPayment.update({ where: { id: bookingPayment.id }, data: { status: "SUCCESS", provider: apiData.payment_method || "CINETPAY", agencyCommission: platformFee, hostPayout: hostPayout, transactionId: transactionId } });
        // ✅ CORRECTION TS : Utilisation de l'Enum BookingStatus
        await tx.booking.update({ where: { id: bookingPayment.bookingId }, data: { status: BookingStatus.PAID } });
        await tx.user.update({ where: { id: hostId }, data: { walletBalance: { increment: hostPayout } } });
        await tx.transaction.create({ data: { amount: hostPayout, type: TransactionType.CREDIT, status: 'SUCCESS', reason: `Réservation Akwaba #${bookingData.listing.title}`, userId: hostId, reference: `AKW-${transactionId}`, balanceType: BalanceType.WALLET, previousHash: "GENESIS" } });
        
        postActions.push(async () => {
            await sendNotification({ userId: bookingData.guestId, title: "Réservation Confirmée ! 🎒", message: `Paiement reçu pour "${bookingData.listing.title}".`, type: "SUCCESS", link: `/dashboard/tenant/bookings/${bookingPayment.bookingId}` });
            await sendNotification({ userId: hostId, title: "Nouvelle Réservation ! 🏠", message: `Réservation payée pour "${bookingData.listing.title}".`, type: "INFO", link: `/dashboard/host/bookings/${bookingPayment.bookingId}` });
        });

        // ✅ CORRECTION TS : bypass strict type pour le logger manquant
        await logActivity({ action: "BOOKING_PAYMENT_SUCCESS" as any, entityId: bookingPayment.bookingId, entityType: "BOOKING", userId: bookingData.guestId, metadata: { amount: amountPaid, hostPayout: hostPayout } });
    } else {
        await tx.bookingPayment.update({ where: { id: bookingPayment.id }, data: { status: "FAILED" } });
    }
}
