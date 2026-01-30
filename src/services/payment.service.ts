import { PaymentStatus, PaymentType, Prisma } from '@prisma/client'; 
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { FINANCE_RULES, CINETPAY_CONFIG } from '@/config/constants'; // Assurez-vous du chemin
import { prisma } from '@/lib/prisma'; // ✅ CORRECTION 1 : Singleton

export class PaymentService {

  // 1. INITIER LE PAIEMENT
  async initiateRentPayment(leaseId: string, user: { email: string, phone: string, name?: string }) {
    
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { property: true }
    });

    if (!lease) throw new Error("Bail introuvable");

    // Vérifier l'historique
    const previousSuccessPayment = await prisma.payment.findFirst({
      where: { leaseId: lease.id, status: PaymentStatus.SUCCESS }
    });

    const isFirstPayment = !previousSuccessPayment;
    const baseRent = lease.monthlyRent;

    let totalAmountToPay = baseRent;
    let description = `Loyer - ${lease.property.title}`;

    // --- LOGIQUE PREMIER MOIS ---
    if (isFirstPayment) {
      const caution = lease.depositAmount; 
      const fraisDossier = FINANCE_RULES.TENANT_FIXED_FEE;
      totalAmountToPay = baseRent + caution + fraisDossier;
      description = `Signature Bail (Loyer + Caution + Frais) - ${lease.property.title}`;
    }

    const transactionId = uuidv4();

    // Création du paiement (PENDING)
    const payment = await prisma.payment.create({
      data: {
        leaseId: lease.id,
        amount: totalAmountToPay,
        type: isFirstPayment ? PaymentType.DEPOSIT : PaymentType.LOYER, 
        status: PaymentStatus.PENDING,
        reference: transactionId,
        date: new Date(),
        amountOwner: 0,
        amountPlatform: 0,
        amountAgent: 0
      }
    });

    // Payload CinetPay
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
      notify_url: CINETPAY_CONFIG.NOTIFY_URL,
      // On redirige vers le dashboard locataire avec un flag success
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant?payment=success`, 
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

  // 2. VALIDATION & VENTILATION (SPLIT)
  async processPaymentSuccess(transactionId: string, method: string) {
    
    const payment = await prisma.payment.findFirst({
      where: { reference: transactionId },
      include: { lease: true }
    });

    // Idempotence : Si déjà traité, on arrête
    if (!payment || payment.status === PaymentStatus.SUCCESS) return "ALREADY_PROCESSED";

    const lease = payment.lease;
    const baseRent = lease.monthlyRent;
    const isFirstPayment = payment.type === PaymentType.DEPOSIT;

    // ✅ CORRECTION 2 : Vérification Agent via le BAIL direct (Plus fiable)
    const hasAgent = !!lease.agentId;

    // --- CALCUL DES PARTS ---
    let platformShare = 0;
    let agentShare = 0;
    let ownerShare = 0;
    let amountForEscrow = 0; // Caution à bloquer

    const platformComm = Math.floor(baseRent * FINANCE_RULES.PLATFORM_COMMISSION_RATE);

    if (isFirstPayment) {
      // SCÉNARIO 1 : SIGNATURE (Loyer + Caution + Frais)
      const fraisDossier = FINANCE_RULES.TENANT_FIXED_FEE;
      amountForEscrow = lease.depositAmount; 
      
      platformShare = fraisDossier + platformComm;
      
      // Si un agent est lié au bail, il prend sa com
      if (hasAgent) {
          agentShare = Math.floor(baseRent * FINANCE_RULES.AGENT_COMMISSION_RATE);
      }
      
      // Le reste du LOYER va au proprio (Base - Coms)
      ownerShare = baseRent - platformComm - agentShare;

    } else {
      // SCÉNARIO 2 : LOYER RÉCURRENT
      platformShare = platformComm;
      
      if (hasAgent) {
          agentShare = Math.floor(baseRent * FINANCE_RULES.AGENT_COMMISSION_RATE);
      }

      ownerShare = baseRent - platformShare - agentShare;
    }

    // ✅ TRANSACTION ATOMIQUE (Rien ne se perd)
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // 1. Update Paiement (Traçabilité)
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

      // 2. Update Propriétaire (Caution & Wallet)
      const property = await tx.property.findUnique({ where: { id: lease.propertyId } });
      
      if (property) {
        await tx.user.update({
          where: { id: property.ownerId },
          data: { 
             // ✅ CORRECTION 3 : ON CRÉDITE LE WALLET DU PROPRIO (Loyer Net)
             walletBalance: { increment: ownerShare },
             // On bloque la caution si nécessaire
             escrowBalance: { increment: amountForEscrow } 
          } 
        });
      }

      // 3. Update Agent (Si applicable)
      if (hasAgent && lease.agentId && agentShare > 0) {
        await tx.user.update({
            where: { id: lease.agentId },
            data: { walletBalance: { increment: agentShare } }
        });
      }
      
      // 4. Update Plateforme (Trésorerie ImmoFacile - Optionnel si géré ailleurs)
      // await tx.agency.update(...) 

      // 5. Activer le bail si c'est le premier paiement
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
