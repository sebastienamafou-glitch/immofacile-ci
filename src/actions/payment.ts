'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Vos clés CinetPay (à mettre dans .env)
const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY;
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID;

export async function initiateInvestmentPayment(contractId: string, phoneNumber: string) {
  try {
    // 1. AUTHENTIFICATION & SÉCURITÉ
    const session = await auth();
    if (!session?.user?.id) return { error: "Non autorisé" };

    // 2. RÉCUPÉRATION DE LA SOURCE DE VÉRITÉ (DATABASE)
    // On ne fait JAMAIS confiance au montant envoyé par le client
    const contract = await prisma.investmentContract.findUnique({
      where: { 
        id: contractId,
        userId: session.user.id // On vérifie que le contrat appartient bien au user
      },
      include: { user: true }
    });

    if (!contract) return { error: "Contrat introuvable." };
    if (contract.status === 'ACTIVE') return { error: "Ce contrat est déjà payé." };

    // 3. GÉNÉRATION TRANSACTION ID UNIQUE
    const transactionId = `INV-${contract.id}-${Date.now()}`;

    // 4. PRÉPARATION PAYLOAD CINETPAY
    // C'est ici que la sécurité se joue : on utilise contract.amount (DB) et pas une variable externe
    const payload = {
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: contract.amount, // ✅ MONTANT BLINDÉ DEPUIS LA DB
      currency: "XOF",
      description: `Investissement ${contract.packName || 'Standard'}`,
      channels: "ALL",
      customer_id: session.user.id,
      customer_name: contract.user.name || "Investisseur",
      customer_surname: "", // Optionnel
      customer_phone_number: phoneNumber,
      customer_email: contract.user.email || "",
      customer_address: "CI",
      customer_city: "Abidjan",
      customer_country: "CI",
      // URL de notification (Webhook) pour valider le paiement plus tard
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay`, 
      // URL de retour client
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/investor/contract/${contract.id}?payment=success`
    };

    // 5. APPEL API CINETPAY (Server-to-Server)
    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.code !== "201") {
      console.error("Erreur CinetPay:", data);
      return { error: data.description || "Erreur d'initialisation CinetPay" };
    }

    // 6. ENREGISTREMENT DE LA TRANSACTION EN ATTENTE (Audit Trail)
    // On crée une trace dans la table Transaction pour suivre le statut
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount: contract.amount,
        type: "DEBIT", // Sortie du wallet (ou Paiement Direct)
        balanceType: "WALLET",
        reason: `Investissement: ${contract.packName}`,
        status: "PENDING", // En attente du Webhook
        reference: transactionId, // Lien avec CinetPay
        // previousHash: ... (Si vous avez un système de hashage blockchain)
      }
    });

    // On lie aussi la référence au contrat
    await prisma.investmentContract.update({
      where: { id: contractId },
      data: { paymentReference: transactionId }
    });

    return { 
      success: true, 
      paymentUrl: data.data.payment_url,
      transactionId: transactionId
    };

  } catch (error: any) {
    console.error("Erreur Payment Server Action:", error);
    return { error: "Erreur serveur critique." };
  }
}
