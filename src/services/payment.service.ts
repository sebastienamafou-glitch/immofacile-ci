import { PaymentStatus, PaymentType, Prisma } from '@prisma/client'; 
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
// Assure-toi que ces constantes sont bien définies
import { FINANCE_RULES, CINETPAY_CONFIG } from '@/config/constants'; 
import { prisma } from '@/lib/prisma'; 

export class PaymentService {

  // 1. INITIER LE PAIEMENT
  // Ajout de 'requestingUserId' pour sécuriser l'accès (IDOR)
  async initiateRentPayment(leaseId: string, user: { id: string, email: string, phone: string, name?: string }) {
    
    // Récupération du bail
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { property: true }
    });

    if (!lease) throw new Error("Bail introuvable");

    // 🔒 SÉCURITÉ : On vérifie que c'est bien le locataire du bail qui paie
    if (lease.tenantId !== user.id) {
        throw new Error("Accès refusé : Vous n'êtes pas le locataire de ce bail.");
    }

    // Vérifier l'historique pour déterminer si c'est le premier paiement
    const previousSuccessPayment = await prisma.payment.findFirst({
      where: { leaseId: lease.id, status: PaymentStatus.SUCCESS }
    });

    const isFirstPayment = !previousSuccessPayment;
    const baseRent = lease.monthlyRent;

    let totalAmountToPay = baseRent;
    let description = `Loyer - ${lease.property.title}`;

    // --- LOGIQUE PREMIER MOIS (Entrée) ---
    if (isFirstPayment) {
      const caution = lease.depositAmount; 
      // @ts-ignore (Vérifie tes types pour FINANCE_RULES)
      const fraisDossier = FINANCE_RULES.TENANT_FIXED_FEE || 20000; 
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
        // Initialisation à 0, sera mis à jour au succès
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
      currency: "XOF",
      description: description,
      customer_email: user.email,
      customer_phone_number: user.phone,
      customer_name: user.name || "Locataire",
      notify_url: CINETPAY_CONFIG.NOTIFY_URL,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tenant?payment=success`, 
      channels: "ALL",
      // Metadata minimalistes pour éviter que CinetPay ne coupe la chaîne
      metadata: JSON.stringify({ leaseId, type: isFirstPayment ? 'DEPOSIT' : 'RENT' })
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
  // Cette fonction sera appelée par ton Webhook ou ta tache de fond
  async processPaymentSuccess(transactionId: string, method: string) {
    
    // On utilise une transaction pour garantir l'intégrité comptable
    return await prisma.$transaction(async (tx) => {
        
        const payment = await tx.payment.findUnique({ // findUnique est plus sûr avec reference @unique
            where: { reference: transactionId },
            include: { lease: true }
        });

        // Idempotence : Si déjà traité, on arrête immédiatement
        if (!payment || payment.status === PaymentStatus.SUCCESS) return "ALREADY_PROCESSED";

        const lease = payment.lease;
        if (!lease) throw new Error("Incohérence: Paiement sans bail lié");

        const baseRent = lease.monthlyRent;
        const isFirstPayment = payment.type === PaymentType.DEPOSIT;
        const hasAgent = !!lease.agentId;

        // --- CALCUL DES PARTS ---
        // (Logique identique à ton fichier, mais sécurisée)
        let platformShare = 0;
        let agentShare = 0;
        let ownerShare = 0;
        let amountForEscrow = 0;

        // @ts-ignore
        const PLATFORM_RATE = FINANCE_RULES.PLATFORM_COMMISSION_RATE || 0.05;
        // @ts-ignore
        const AGENT_RATE = FINANCE_RULES.AGENT_COMMISSION_RATE || 0.05;
        // @ts-ignore
        const FIXED_FEE = FINANCE_RULES.TENANT_FIXED_FEE || 20000;

        const platformComm = Math.floor(baseRent * PLATFORM_RATE);

        if (isFirstPayment) {
            amountForEscrow = lease.depositAmount; 
            platformShare = FIXED_FEE + platformComm;
            
            if (hasAgent) {
                agentShare = Math.floor(baseRent * AGENT_RATE);
            }
            // Le reste : Loyer + Caution - Coms
            // Note: La caution (escrow) est incluse dans le montant total payé par le client
            // Ici ownerShare représente ce qui est "disponible" (Loyer net).
            // La caution va dans l'escrowBalance.
            ownerShare = payment.amount - platformShare - agentShare - amountForEscrow;
        } else {
            platformShare = platformComm;
            if (hasAgent) {
                agentShare = Math.floor(baseRent * AGENT_RATE);
            }
            ownerShare = payment.amount - platformShare - agentShare;
        }

        // 1. Update Paiement
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

        // 2. Update Propriétaire (CORRIGÉ : UserFinance)
        const property = await tx.property.findUnique({ where: { id: lease.propertyId } });
        
        if (property) {
            // ✅ UPSERT : On crée la ligne finance si elle n'existe pas
            await tx.userFinance.upsert({
                where: { userId: property.ownerId },
                create: {
                    userId: property.ownerId,
                    walletBalance: ownerShare,
                    escrowBalance: amountForEscrow,
                    version: 1
                },
                update: { 
                    walletBalance: { increment: ownerShare },
                    escrowBalance: { increment: amountForEscrow },
                    version: { increment: 1 } // Optimistic Locking
                } 
            });
        }

        // 3. Update Agent (CORRIGÉ : UserFinance)
        if (hasAgent && lease.agentId && agentShare > 0) {
            await tx.userFinance.upsert({
                where: { userId: lease.agentId },
                create: {
                    userId: lease.agentId,
                    walletBalance: agentShare,
                    version: 1
                },
                update: { 
                    walletBalance: { increment: agentShare },
                    version: { increment: 1 }
                }
            });
        }
        
        // 5. Activer le bail
        if (isFirstPayment) {
            await tx.lease.update({
                where: { id: lease.id },
                data: { isActive: true, status: 'ACTIVE' }
            });
        }

        return "SUCCESS";
    });
  }

  async markPaymentFailed(transactionId: string) {
    // Utilisation de updateMany car 'reference' est unique, mais prisma.payment.update requiert l'ID ou un @unique
    // updateMany est safe ici.
    await prisma.payment.update({
      where: { reference: transactionId },
      data: { status: PaymentStatus.FAILED }
    });
  }
}
