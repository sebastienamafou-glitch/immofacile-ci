'use client';

import { useState } from 'react';
import { Gavel, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { submitSaleOffer } from '@/features/sales/actions';
import { useRouter } from 'next/navigation';

interface OfferButtonProps {
  propertyId: string;
  propertyTitle: string;
  minPrice: number;
  userKycStatus?: string;
  isLoggedIn: boolean;
}

export function OfferButton({ 
  propertyId, minPrice, userKycStatus, isLoggedIn 
}: OfferButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(minPrice);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleOffer = async () => {
    if (amount < (minPrice * 0.7)) {
        return toast.error("L'offre est trop basse par rapport au prix demandé.");
    }

    setIsPending(true);
    try {
      await submitSaleOffer(propertyId, amount);
      toast.success("Votre offre a été transmise au vendeur !");
      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setIsPending(false);
    }
  };

  // --- ÉTATS DE GARDE-FOU ---
  if (!isLoggedIn) {
    return (
      <button 
        onClick={() => router.push('/login')}
        className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-all"
      >
        <Lock className="w-4 h-4" /> Se connecter pour faire une offre
      </button>
    );
  }

  if (userKycStatus !== 'VERIFIED') {
    return (
      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl space-y-3">
        <div className="flex items-start gap-2 text-orange-500">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-xs font-bold leading-tight uppercase">Vérification Requise</p>
        </div>
        <p className="text-[11px] text-slate-400">Vous devez valider votre identité (KYC) avant de pouvoir soumettre une offre d&apos;achat.</p>
        <button 
          onClick={() => router.push('/dashboard/kyc/verify')}
          className="w-full bg-orange-500 text-white text-xs font-black py-3 rounded-xl hover:bg-orange-600 transition-colors"
        >
          VÉRIFIER MON IDENTITÉ
        </button>
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center gap-2 active:scale-95"
      >
        <Gavel className="w-5 h-5" /> FAIRE UNE OFFRE D&apos;ACHAT
      </button>

      {/* MODALE D'OFFRE (Simple Implementation) */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-[#0B1120] border border-slate-800 w-full max-w-md p-8 rounded-[32px] shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-2">Votre Offre</h2>
            <p className="text-slate-400 text-sm mb-8">Proposez un prix au vendeur. Les offres sérieuses ont plus de chances d&apos;être acceptées.</p>
            
            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 block">Montant proposé (FCFA)</label>
                    <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full bg-white/5 border border-slate-800 text-white text-3xl font-black p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-400 hover:bg-white/5 transition-colors"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleOffer}
                        disabled={isPending}
                        className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-4 rounded-2xl shadow-lg shadow-orange-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer l'offre"}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
