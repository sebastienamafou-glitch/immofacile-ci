import { PrismaClient, PaymentStatus, PaymentType, Lease, Prisma } from '@prisma/client'; // 
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { FINANCE_RULES, CINETPAY_CONFIG } from '../config/constants';

const prisma = new PrismaClient();

export class PaymentService {

  // 1. INITIER LE PAIEMENT
  async initiateRentPayment(leaseId: string, user: { email: string, phone: string, name?: string }) {
    
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { property: true }
    });

    if (!lease) throw new Error("Bail introuvable");

    // Vérifier l'historique pour savoir si c'est le premier paiement
    const previousSuccessPayment = await prisma.payment.findFirst({
      where: { leaseId: lease.id, status: PaymentStatus.SUCCESS }
    });

    const isFirstPayment = !previousSuccessPayment;
    const baseRent = lease.monthlyRent;

    let totalAmountToPay = baseRent;
    let description = `Loyer - ${lease.property.title}`;

    // --- LOGIQUE PREMIER MOIS (Signature) ---
    if (isFirstPayment) {
      const caution = lease.depositAmount; // 
      const fraisDossier = FINANCE_RULES.TENANT_FIXED_FEE;

      totalAmountToPay = baseRent + caution + fraisDossier;
      description = `Signature Bail (Loyer + Caution + Frais) - ${lease.property.title}`;
    }

    const transactionId = uuidv4();

    // Création du paiement en base (PENDING)
    const payment = await prisma.payment.create({
      data: {
        leaseId: lease.id,
        amount: totalAmountToPay,
        type: isFirstPayment ? PaymentType.DEPOSIT : PaymentType.LOYER, // 
        status: PaymentStatus.PENDING,
        reference: transactionId,
        date: new Date(),
        // Initialisation à 0
        amountOwner: 0,
        amountPlatform: 0,
        amountAgent: 0
      }
    });

    // Appel CinetPay (VRAIE API)
    const payload = {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: transactionId,
      amount: totalAmountToPay,
      currency: FINANCE_RULES.CURRENCY,
      description: description,
      customer_email: user.email,
      customer_phone_number: user.phone,
      customer_name: user.name || "Locataire",
      notify_url: CINETPAY_CONFIG.NOTIFY_URL, // Url du webhook
      return_url: `${process.env.FRONTEND_URL}/dashboard/tenant?payment=success`, // Retour Dashboard
      channels: "ALL",
      metadata: JSON.stringify({ leaseId, isFirstPayment })
    };

    try {
      const response = await axios.post(CINETPAY_CONFIG.BASE_URL, payload);
      if (response.data.code === "201") {
        return { paymentUrl: response.data.data.payment_url, paymentId: payment.id };
      } else {
        throw new Error(`Erreur CinetPay: ${response.data.description}`);
      }
    } catch (error) {
      console.error("Erreur Init Paiement:", error);
      throw error;
    }
  }

  // 2. VALIDATION & SPLIT
  async processPaymentSuccess(transactionId: string, method: string) {
    
    const payment = await prisma.payment.findFirst({
      where: { reference: transactionId },
      include: { lease: true }
    });

    if (!payment || payment.status === PaymentStatus.SUCCESS) return;

    const lease = payment.lease;
    const baseRent = lease.monthlyRent;
    const isFirstPayment = payment.type === PaymentType.DEPOSIT;

    // Vérifier Agent
    const agentMission = await prisma.mission.findFirst({
      where: { propertyId: lease.propertyId, agentId: { not: null }, status: { in: ['ACCEPTED', 'COMPLETED'] } }
    });
    const hasAgent = !!agentMission && agentMission.agentId;

    // --- CALCUL DES PARTS (SPLIT) ---
    let platformShare = 0;
    let agentShare = 0;
    let ownerShare = 0;
    let amountForEscrow = 0;

    const platformComm = Math.floor(baseRent * FINANCE_RULES.PLATFORM_COMMISSION_RATE);

    if (isFirstPayment) {
      // SCÉNARIO 1 : SIGNATURE
      const fraisDossier = FINANCE_RULES.TENANT_FIXED_FEE;
      amountForEscrow = lease.depositAmount; 
      
      platformShare = fraisDossier + platformComm;
      if (hasAgent) agentShare = Math.floor(baseRent * FINANCE_RULES.AGENT_COMMISSION_RATE);
      ownerShare = baseRent - platformComm - agentShare;

    } else {
      // SCÉNARIO 2 : LOYER RÉCURRENT
      platformShare = platformComm;
      ownerShare = baseRent - platformShare;
    }

    // TRANSACTION ATOMIQUE (Typage tx corrigé ici)
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // Update Paiement
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          method: method,
          amountPlatform: platformShare,
          amountAgent: agentShare,
          amountOwner: ownerShare,
          date: new Date()
        }
      });

      // Update Propriétaire (Caution)
      const property = await tx.property.findUnique({ where: { id: lease.propertyId } });
      if (property && amountForEscrow > 0) {
        await tx.user.update({
          where: { id: property.ownerId },
          data: { escrowBalance: { increment: amountForEscrow } } 
        });
      }

      // Activer le bail
      if (isFirstPayment) {
        await tx.lease.update({
          where: { id: lease.id },
          data: { isActive: true, status: 'ACTIVE' }
        });
      }
    });

    return "SUCCESS";
  }

  async markPaymentFailed(transactionId: string) {
    await prisma.payment.updateMany({
      where: { reference: transactionId },
      data: { status: PaymentStatus.FAILED }
    });
  }
}
