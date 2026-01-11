import { NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';
import axios from 'axios';
import { CINETPAY_CONFIG } from '@/config/constants'; // Utilisez @ ici aussi

const paymentService = new PaymentService();

export async function POST(request: Request) {
  try {
    // CinetPay envoie souvent en x-www-form-urlencoded
    const formData = await request.formData();
    const transactionId = formData.get('cpm_trans_id') as string || formData.get('cpm_custom') as string;

    // Fallback : Si ce n'est pas du FormData, essayer du JSON (cas rares ou tests)
    let finalTransactionId = transactionId;
    if (!finalTransactionId) {
       try {
         const jsonBody = await request.json();
         finalTransactionId = jsonBody.cpm_trans_id || jsonBody.cpm_custom;
       } catch (e) {
         // Ignore json parse error
       }
    }

    if (!finalTransactionId) {
      return NextResponse.json({ error: "No transaction ID" }, { status: 400 });
    }

    // 1. Vérification CinetPay
    const checkUrl = "https://api-checkout.cinetpay.com/v2/payment/check";
    const checkPayload = {
      apikey: CINETPAY_CONFIG.API_KEY,
      site_id: CINETPAY_CONFIG.SITE_ID,
      transaction_id: finalTransactionId
    };

    const response = await axios.post(checkUrl, checkPayload);
    const data = response.data.data;

    // 2. Traitement
    if (response.data.code === "00" && data.status === "ACCEPTED") {
      await paymentService.processPaymentSuccess(finalTransactionId, data.payment_method);
    } else {
      await paymentService.markPaymentFailed(finalTransactionId);
    }

    // 3. Réponse 200 OK
    return new NextResponse("OK", { status: 200 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return new NextResponse("Error", { status: 500 });
  }
}
