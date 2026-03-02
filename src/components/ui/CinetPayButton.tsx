"use client";

import { useState } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";

// Extension de l'objet Window pour le typage strict du SDK CinetPay
declare global {
  interface Window {
    CinetPay: {
      setConfig: (config: any) => void;
      getCheckout: (checkoutData: any) => void;
      waitResponse: (callback: (data: any) => void) => void;
      onError: (callback: (data: any) => void) => void;
    };
  }
}

interface CinetPayButtonProps {
  amount: number;
  transactionId: string; // Doit être généré côté serveur (ex: UUID)
  description: string;
}

export default function CinetPayButton({ amount, transactionId, description }: CinetPayButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = () => {
    if (!window.CinetPay || !isReady) return;
    setIsLoading(true);

    // 1. Configuration (Utiliser les variables d'environnement NEXT_PUBLIC)
    window.CinetPay.setConfig({
      apikey: process.env.NEXT_PUBLIC_CINETPAY_API_KEY || "",
      site_id: process.env.NEXT_PUBLIC_CINETPAY_SITE_ID || "",
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cinetpay`,
      mode: "PRODUCTION", // ou "SANDBOX"
    });

    // 2. Initialisation du guichet
    window.CinetPay.getCheckout({
      transaction_id: transactionId,
      amount: amount,
      currency: "XOF",
      channels: "ALL",
      description: description,
      // Paramètres optionnels pour pré-remplir le client
      // customer_name: "Nom",
      // customer_surname: "Prénom",
    });

    // 3. Écoute des retours clients (Le vrai statut sera géré par le Webhook)
    window.CinetPay.waitResponse((data) => {
      setIsLoading(false);
      if (data.status === "ACCEPTED") {
        window.location.href = `/invest/success?tx=${transactionId}`;
      }
    });

    window.CinetPay.onError((error) => {
      console.error("Erreur CinetPay:", error);
      setIsLoading(false);
    });
  };

  return (
    <>
      <Script 
        src="https://cdn.cinetpay.com/seamless/main.js" 
        onReady={() => setIsReady(true)}
      />
      
      <button 
        onClick={handlePayment}
        disabled={!isReady || isLoading}
        className="w-full py-4 bg-[#F59E0B] hover:bg-orange-500 text-[#020617] disabled:opacity-50 disabled:cursor-not-allowed font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.2)] transition transform hover:scale-105 flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
      >
        {isLoading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Traitement...</>
        ) : (
          "Procéder au paiement sécurisé"
        )}
      </button>
    </>
  );
}
