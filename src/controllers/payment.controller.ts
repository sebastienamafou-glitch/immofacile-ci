import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import axios from 'axios';
import { CINETPAY_CONFIG } from '../config/constants';

const paymentService = new PaymentService();

export class PaymentController {
  
  // Endpoint: POST /api/payments/rent
  async payRent(req: Request, res: Response) {
    try {
      const { leaseId, email, phone, name } = req.body;
      
      if (!leaseId || !phone) {
        return res.status(400).json({ error: "Champs requis manquants (leaseId, phone)" });
      }

      const result = await paymentService.initiateRentPayment(leaseId, { email, phone, name });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erreur serveur" });
    }
  }

  // Endpoint: POST /api/payments/webhook
  async handleWebhook(req: Request, res: Response) {
    // CinetPay envoie souvent les données en x-www-form-urlencoded
    // On extrait l'ID de transaction (cpm_trans_id)
    const transactionId = req.body.cpm_trans_id || req.body.cpm_custom;

    if (!transactionId) {
      return res.status(400).send("No transaction ID");
    }

    try {
      // VÉRIFICATION OBLIGATOIRE CÔTÉ SERVEUR (Ne jamais faire confiance au body seul)
      const checkUrl = "https://api-checkout.cinetpay.com/v2/payment/check";
      const checkPayload = {
        apikey: CINETPAY_CONFIG.API_KEY,
        site_id: CINETPAY_CONFIG.SITE_ID,
        transaction_id: transactionId
      };

      const response = await axios.post(checkUrl, checkPayload);
      const data = response.data.data;
      const code = response.data.code;

      if (code === "00" && data.status === "ACCEPTED") {
        // Paiement validé, on lance le split
        await paymentService.processPaymentSuccess(transactionId, data.payment_method);
      } else {
        // Paiement échoué
        await paymentService.markPaymentFailed(transactionId);
      }

      // Toujours répondre 200 à CinetPay pour confirmer la réception
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook Error", error);
      res.status(500).send("Error processing webhook");
    }
  }
}
