"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CreditCard, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CheckoutFormProps {
  bookingId: string;
  amount: number;
}

export default function CheckoutForm({ bookingId, amount }: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<string>("ALL");

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Initialisation du paiement (Appel Serveur)
      const res = await fetch("/api/akwaba/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur d'initialisation");
      if (!data.paymentUrl) throw new Error("Pas d'URL de paiement reçue");

      // 2. Redirection vers le Guichet Sécurisé CinetPay
      toast.info("Redirection vers CinetPay...");
      window.location.href = data.paymentUrl;

    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SÉLECTEUR DE PAIEMENT (Visuel) */}
      <div className="grid grid-cols-3 gap-3">
        <PaymentOption 
            active={method === "ALL"} 
            onClick={() => setMethod("ALL")}
            label="Mobile Money"
            color="bg-orange-500"
        />
        <PaymentOption 
            active={method === "ALL"} 
            onClick={() => setMethod("ALL")}
            label="Wave"
            color="bg-blue-500"
        />
        <PaymentOption 
            active={method === "ALL"} 
            onClick={() => setMethod("ALL")}
            label="Carte Visa"
            color="bg-slate-800"
            icon={<CreditCard className="w-5 h-5"/>}
        />
      </div>

      {/* INFO SÉCURITÉ */}
      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex items-start gap-3">
        <Lock className="w-5 h-5 text-emerald-600 mt-0.5" />
        <div className="text-sm text-emerald-800">
            <p className="font-bold">Paiement 100% Sécurisé par CinetPay</p>
            <p>Vous allez être redirigé vers le guichet bancaire sécurisé pour valider la transaction.</p>
        </div>
      </div>

      {/* BOUTON D'ACTION */}
      <Button 
        onClick={handlePayment} 
        disabled={loading}
        className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xl transition-all"
      >
        {loading ? <Loader2 className="animate-spin mr-2" /> : "Payer maintenant"}
        {!loading && <span className="ml-2">{amount.toLocaleString()} FCFA</span>}
      </Button>

      <div className="flex justify-center items-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4" /> Transactions chiffrées SSL 256-bits
      </div>
    </div>
  );
}

function PaymentOption({ active, onClick, label, color, icon }: any) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all hover:bg-slate-50 opacity-100",
                "border-slate-200 hover:border-slate-400"
            )}
        >
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs", color)}>
                {icon || label[0]}
            </div>
            <span className="text-sm font-bold text-slate-700">{label}</span>
        </div>
    )
}
