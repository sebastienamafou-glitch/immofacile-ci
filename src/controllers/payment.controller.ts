import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import axios from 'axios';
import { CINETPAY_CONFIG } from '../config/constants';
import { prisma } from '../lib/prisma'; 
import { PaymentProvider, PaymentStatus } from '@prisma/client'; 

const paymentService = new PaymentService();

export class PaymentController {
  
  // Endpoint: POST /api/payments/rent
  async payRent(req: Request, res: Response) {
    try {
      // 🔒 CORRECTION : Extraction de userId depuis la requête front-end
      const { leaseId, email, phone, name, userId } = req.body;
      
      if (!leaseId || !phone) {
        return res.status(400).json({ error: "Champs requis manquants (leaseId, phone)" });
      }

      // 🔒 CORRECTION : Utilisation du userId fourni ou fallback système
      const safeUserId = userId || "system_user";
      const result = await paymentService.initiateRentPayment(leaseId, { id: safeUserId, email, phone, name });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erreur serveur" });
    }
  }

  // Endpoint: POST /api/payments/webhook
  async handleWebhook(req: Request, res: Response) {
    const transactionId = req.body.cpm_trans_id || req.body.cpm_custom;

    if (!transactionId) {
      return res.status(400).send("No transaction ID");
    }

    try {
      const checkUrl = "https://api-checkout.cinetpay.com/v2/payment/check";
      const checkPayload = {
        apikey: CINETPAY_CONFIG.API_KEY,
        site_id: CINETPAY_CONFIG.SITE_ID,
        transaction_id: transactionId
      };

      const response = await axios.post(checkUrl, checkPayload);
      const data = response.data.data;
      const code = response.data.code;

      // 🔒 CORRECTION : Remplacement des appels de service inexistants par Prisma
      if (code === "00" && data.status === "ACCEPTED") {
        await prisma.payment.update({
            where: { reference: transactionId },
            data: { status: PaymentStatus.SUCCESS, method: PaymentProvider.CINETPAY }
        });
      } else {
        await prisma.payment.update({
            where: { reference: transactionId },
            data: { status: PaymentStatus.FAILED }
        });
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook Error", error);
      res.status(500).send("Error processing webhook");
    }
  }
}
