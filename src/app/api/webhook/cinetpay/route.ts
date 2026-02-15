import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { Role } from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";
import { sendNotification } from "@/lib/notifications";
import * as Sentry from "@sentry/nextjs";
import { logActivity } from "@/lib/logger";

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
    let body: any;
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

      // A. RECHERCHE ET VERROUILLAGE (Tous les types possibles)
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

      // -----------------------------------------------------------------------
      // CAS 1 : PAIEMENT IMMO STANDARD (Loyer, Caution, Devis, TopUp)
      // -----------------------------------------------------------------------
      if (paymentRecord) {
        // Idempotence
        if (paymentRecord.status === "SUCCESS") return;

        // Sécurité Montant
        if (isValidPayment && amountPaid !== paymentRecord.amount) {
          console.error(`Fraud Alert: Amount mismatch for Tx ${transactionId}`);
          await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: "FAILED" } });
          // On ne throw pas d'erreur pour ne pas faire "retry" le webhook indéfiniment, on accepte l'échec.
          return;
        }

        if (isValidPayment) {
          // CAS 1.1 : LOYER & CAUTION (Lease)
          if (paymentRecord.lease) {
            // Calculs de ventilation
            let platformShare = 0, agentShare = 0, agencyShare = 0, ownerShare = 0;
            const baseRent = paymentRecord.lease.monthlyRent;
            const appliedAgencyRate = paymentRecord.lease.agencyCommissionRate || FEES.AGENCY_DEFAULT_RATE;

            if (paymentRecord.type === "DEPOSIT") {
              platformShare = FEES.TENANT_ENTRANCE_FEE + Math.floor(baseRent * FEES.PLATFORM_RECURRING_RATE);
              if (paymentRecord.lease.agentId) agentShare = Math.floor(baseRent * FEES.AGENT_SUCCESS_FEE_RATE);
              if (paymentRecord.lease.property.agencyId) agencyShare = Math.floor(baseRent * appliedAgencyRate);
              ownerShare = amountPaid - platformShare - agentShare - agencyShare;
            } else {
              // Loyer simple
              platformShare = Math.floor(amountPaid * FEES.PLATFORM_RECURRING_RATE);
              if (paymentRecord.lease.property.agencyId) agencyShare = Math.floor(amountPaid * appliedAgencyRate);
              ownerShare = amountPaid - platformShare - agencyShare;
            }

            // Créditer le propriétaire
            const ownerId = paymentRecord.lease.property.ownerId;
            // Upsert du UserFinance
            await tx.userFinance.upsert({
              where: { userId: ownerId },
              update: { walletBalance: { increment: ownerShare } },
              create: { userId: ownerId, walletBalance: ownerShare, version: 1 }
            });

            // Activer le bail si c'est une caution
            if (paymentRecord.lease.status === "PENDING" && paymentRecord.type === "DEPOSIT") {
              await tx.lease.update({ where: { id: paymentRecord.lease.id }, data: { status: "ACTIVE", isActive: true } });
            }

            // Marquer paiement succès
            await tx.payment.update({
              where: { id: paymentRecord.id },
              data: { status: "SUCCESS", method: apiData.payment_method || "UNKNOWN", providerResponse: apiData as any }
            });

            // Créer transaction (Ledger)
            await tx.transaction.create({
              data: {
                amount: ownerShare,
                type: 'CREDIT',
                status: 'SUCCESS',
                reason: `Loyer/Caution ${paymentRecord.lease.property.title}`,
                userId: ownerId,
                reference: `RENT-${transactionId}`,
                balanceType: 'WALLET',
                previousHash: "GENESIS"
              }
            });

            // Log Activité
            await logActivity({
              action: "PAYMENT_SUCCESS",
              entityId: transactionId,
              entityType: "PAYMENT",
              userId: ownerId,
              metadata: { amount: amountPaid, type: "LEASE_RENT", provider: "CINETPAY" }
            });

          }
          // CAS 1.2 : DEVIS ARTISAN
          else if (paymentRecord.quote) {
            await tx.quote.update({ where: { id: paymentRecord.quoteId! }, data: { status: 'PAID' } });
            await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: "SUCCESS" } });

            const artisanId = paymentRecord.quote.artisanId;
            await tx.userFinance.upsert({
              where: { userId: artisanId },
              update: { walletBalance: { increment: paymentRecord.amount } },
              create: { userId: artisanId, walletBalance: paymentRecord.amount, version: 1 }
            });
          }

          // CAS 1.3 : RECHARGEMENT WALLET (TOPUP)
          else if (paymentRecord.type === "TOPUP" || paymentRecord.type === "CHARGES") {
            let userIdFromMeta = null;
            try {
              // On tente de parser les métadonnées pour trouver l'user
              const metaSource = body.metadata || body.cpm_custom;
              const meta = metaSource ? (typeof metaSource === 'string' ? JSON.parse(metaSource) : metaSource) : null;
              userIdFromMeta = meta?.userId;
            } catch (e) { console.log("No metadata parseable for TopUp"); }

            if (userIdFromMeta) {
              // 1. Créditer le Wallet
              await tx.userFinance.upsert({
                where: { userId: userIdFromMeta },
                update: { walletBalance: { increment: paymentRecord.amount } },
                create: { userId: userIdFromMeta, walletBalance: paymentRecord.amount, version: 1 }
              });

              // 2. Création Historique Transaction (CRITIQUE)
              await tx.transaction.create({
                data: {
                  userId: userIdFromMeta,
                  amount: paymentRecord.amount,
                  type: "CREDIT",
                  balanceType: "WALLET",
                  status: "SUCCESS",
                  reason: "Rechargement par Mobile Money",
                  reference: `TOPUP-${transactionId}`,
                  previousHash: "GENESIS"
                }
              });

              // 3. Update Statut
              await tx.payment.update({
                where: { id: paymentRecord.id },
                data: { status: "SUCCESS", method: apiData.payment_method || "UNKNOWN" }
              });

              // 4. Log
              await logActivity({
                action: "PAYMENT_SUCCESS",
                entityId: transactionId,
                entityType: "PAYMENT",
                userId: userIdFromMeta,
                metadata: { amount: amountPaid, provider: "CINETPAY", type: "TOPUP" }
              });

            } else {
              console.error(`TOPUP FAILED: No User ID found in metadata for Tx ${transactionId}`);
              await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: "FAILED" } });
            }
          }

        } else {
          // Paiement invalide (Echec CinetPay)
          await tx.payment.update({ where: { id: paymentRecord.id }, data: { status: "FAILED" } });
        }
      }

      // -----------------------------------------------------------------------
      // CAS 2 : INVESTISSEMENT
      // -----------------------------------------------------------------------
      else if (investmentContract) {
        if (investmentContract.status === "ACTIVE") return;

        if (isValidPayment) {
          // Activer contrat
          await tx.investmentContract.update({ where: { id: investmentContract.id }, data: { status: "ACTIVE" } });
          // Promouvoir User
          await tx.user.update({ where: { id: investmentContract.userId }, data: { role: Role.INVESTOR, isBacker: true } });

          // Log Investissement
          await logActivity({
            action: "PAYMENT_SUCCESS",
            entityId: transactionId,
            entityType: "INVESTMENT",
            userId: investmentContract.userId,
            metadata: { amount: amountPaid, type: "INVESTMENT" }
          });

        } else {
          await tx.investmentContract.update({ where: { id: investmentContract.id }, data: { status: "FAILED" } });
        }
      }

      // -----------------------------------------------------------------------
      // CAS 3 : RÉSERVATION AKWABA (Court Séjour)
      // -----------------------------------------------------------------------
      else if (bookingPayment) {
        if (bookingPayment.status === "SUCCESS") return;

        // 1. CHARGEMENT DES DONNÉES CRITIQUES (AVANT TOUTE ACTION)
        // On récupère le listing et le host MAINTENANT pour ne pas planter plus tard
        const bookingData = await tx.booking.findUnique({
          where: { id: bookingPayment.bookingId },
          include: {
            listing: { select: { title: true, hostId: true } }
          }
        });

        // Si la réservation n'existe plus, c'est une incohérence grave
        if (!bookingData || !bookingData.listing) {
            console.error(`Data Integrity Error: Booking ${bookingPayment.bookingId} not found for payment ${transactionId}`);
            // On marque l'échec technique mais on commit la transaction pour ne pas bloquer CinetPay
            await tx.bookingPayment.update({ where: { id: bookingPayment.id }, data: { status: "FAILED_DATA_ERROR" } });
            return;
        }

        if (isValidPayment) {
          // Sécurité Montant
          if (amountPaid !== bookingPayment.amount) {
            console.error(`Fraud Alert Akwaba: Amount mismatch ${transactionId}. Expected ${bookingPayment.amount}, got ${amountPaid}`);
            await tx.bookingPayment.update({ where: { id: bookingPayment.id }, data: { status: "FAILED_AMOUNT_MISMATCH" } });
            return;
          }

          // Calculs Financiers
          const platformFee = Math.round(amountPaid * 0.10); // 10%
          const hostPayout = amountPaid - platformFee;       // 90%

          // A. Mise à jour du Paiement
          await tx.bookingPayment.update({
            where: { id: bookingPayment.id },
            data: {
              status: "SUCCESS",
              provider: apiData.payment_method || "CINETPAY",
              agencyCommission: platformFee,
              hostPayout: hostPayout,
              transactionId: transactionId // On confirme l'ID
            }
          });

          // B. Mise à jour de la Réservation
          await tx.booking.update({
            where: { id: bookingPayment.bookingId },
            data: { status: "PAID" }
          });

          // C. Crédit Wallet Hôte
          const hostId = bookingData.listing.hostId;
          await tx.userFinance.upsert({
            where: { userId: hostId },
            update: { walletBalance: { increment: hostPayout } },
            create: { userId: hostId, walletBalance: hostPayout, version: 1 }
          });

          // D. Création Transaction (Ledger)
          await tx.transaction.create({
            data: {
              amount: hostPayout,
              type: 'CREDIT',
              status: 'SUCCESS',
              reason: `Réservation Akwaba #${bookingData.listing.title}`,
              userId: hostId,
              reference: `AKW-${transactionId}`,
              balanceType: 'WALLET',
              previousHash: "GENESIS"
            }
          });

          // E. Notifications (Non-bloquantes)
          // On utilise setImmediate ou on laisse l'event loop gérer après la transaction
          // (Ici on attend l'await, ce qui est acceptable pour un webhook)
          
          try {
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
          } catch(notifError) {
              console.warn("Notification failed but payment succeeded", notifError);
          }

          // F. Audit Log
          await logActivity({
            action: "BOOKING_PAYMENT_SUCCESS",
            entityId: bookingPayment.bookingId,
            entityType: "BOOKING",
            userId: bookingData.guestId,
            metadata: {
              amount: amountPaid,
              hostPayout: hostPayout,
              provider: "CINETPAY",
              transactionId: transactionId
            }
          });

        } else {
          // Paiement refusé par CinetPay
          await tx.bookingPayment.update({
            where: { id: bookingPayment.id },
            data: { status: "FAILED" }
          });
        }
      }

    }, {
      isolationLevel: "Serializable", // Niveau de sécurité maximal
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

    // On répond 200 à CinetPay même en cas d'erreur interne pour éviter qu'il ne nous bombarde de retries
    // (L'erreur est loguée dans Sentry pour intervention humaine)
    return new NextResponse("Processed with error", { status: 200 });
  }
}
