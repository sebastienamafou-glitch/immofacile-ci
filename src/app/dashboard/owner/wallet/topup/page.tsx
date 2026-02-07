"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ArrowLeft, Wallet, ShieldCheck, CreditCard, Smartphone, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

// 1. FORMULAIRE ISOLÉ (Pour la compatibilité Suspense)
function TopUpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Récupération intelligente du montant (URL ou vide)
  const initialAmount = searchParams.get("amount") ? parseInt(searchParams.get("amount") as string) : 0;
  
  const [amount, setAmount] = useState<number | string>(initialAmount > 0 ? initialAmount : "");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  
  // Clé unique pour éviter les doubles débits accidentels
  const [idempotencyKey] = useState(uuidv4());

  const handlePaymentInit = async () => {
    const value = Number(amount);
    
    // VALIDATION STRICTE
    if (!value || value < 100) {
        toast.error("Le montant minimum est de 100 FCFA");
        return;
    }
    if (!phone.match(/^(01|05|07)\d{8}$/)) {
        toast.error("Numéro invalide (Format: 0707070707)");
        return;
    }

    setLoading(true);

    try {
        // 🚀 APPEL API RÉEL (PRODUCTION)
        const res = await api.post("/payment/init", {
            type: "DEPOSIT",           // Type transaction
            amount: value,             // Montant réel
            phone: phone,              // Numéro mobile money
            idempotencyKey: idempotencyKey,
            referenceId: "WALLET_TOPUP", // Tag pour le backend
            description: `Rechargement Wallet - ${value} FCFA`
        });

        if (res.data.success && res.data.paymentUrl) {
            // Redirection vers le guichet sécurisé (CinetPay / Wave / etc.)
            window.location.href = res.data.paymentUrl;
        } else {
            toast.error("Erreur: Pas d'URL de paiement reçue.");
        }

    } catch (e: any) {
        console.error("Payment Error:", e);
        toast.error(e.response?.data?.error || "Échec de l'initialisation du paiement");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center gap-4 mb-8">
            <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5"/>
            </Button>
            <div>
                <h1 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-orange-500"/> Rechargement
                </h1>
                <p className="text-xs text-slate-500">Ajoutez des fonds sécurisés à votre Wallet</p>
            </div>
        </div>

        {/* Carte de Paiement */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Effet visuel d'arrière-plan */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>

            <div className="space-y-6 relative z-10">
                {/* Champ Montant */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Montant à créditer</label>
                    <div className="relative">
                        <Input 
                            type="number" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-slate-900/50 border-slate-700 text-white text-2xl font-bold h-16 pl-4 pr-16 rounded-xl focus:border-orange-500 transition-colors"
                            placeholder="0"
                            min="100"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">FCFA</span>
                    </div>
                    {initialAmount > 0 && (
                        <div className="flex items-center gap-2 text-orange-400 text-xs mt-2 bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">
                            <AlertTriangle className="w-3 h-3"/>
                            Montant pré-rempli pour votre opération
                        </div>
                    )}
                </div>

                {/* Champ Téléphone */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Numéro Mobile Money</label>
                    <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5"/>
                        <Input 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)}
                            className="bg-slate-900/50 border-slate-700 text-white pl-12 h-12 rounded-xl"
                            placeholder="0707070707"
                            maxLength={10}
                        />
                    </div>
                    <p className="text-[10px] text-slate-500">Numéro qui sera débité (Wave, Orange, MTN, Moov)</p>
                </div>

                {/* Bouton d'action */}
                <Button 
                    onClick={handlePaymentInit} 
                    disabled={loading || !amount || !phone}
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold h-14 rounded-xl text-sm uppercase tracking-widest shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <CreditCard className="w-5 h-5 mr-2"/>}
                    {loading ? "Initialisation..." : "Procéder au paiement sécurisé"}
                </Button>
            </div>
        </div>

        {/* Footer Trust */}
        <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-500"/>
                Transaction chiffrée & sécurisée
            </div>
        </div>
    </div>
  );
}

// 2. EXPORT AVEC SUSPENSE (OBLIGATOIRE POUR NEXT.JS BUILD)
export default function TopUpWalletPage() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white flex items-center gap-2"><Loader2 className="animate-spin"/> Chargement du module bancaire...</div>}>
        <TopUpForm />
      </Suspense>
    </div>
  );
}
