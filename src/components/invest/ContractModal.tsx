'use client';

import { useState, useRef } from 'react';
import Image from 'next/image'; 
import SignatureCanvas from 'react-signature-canvas';
import { Loader2, Eraser, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

// ✅ ON IMPORTE LA NOUVELLE ACTION SÉCURISÉE
import { initiateInvestmentPayment } from '@/actions/payment'; 
// On garde l'action de signature existante
import { signInvestmentContract } from '@/lib/actions/contract'; 

interface ContractModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string; 
    amount: number;
    packName: string;
  };
  onSuccess: () => void;
}

export default function ContractModal({ user, onSuccess }: ContractModalProps) {
  const [isSigned, setIsSigned] = useState(false);
  const [loading, setLoading] = useState(false);
  const sigPad = useRef<SignatureCanvas>(null);

  const clearSignature = () => sigPad.current?.clear();

  const handleSignAndPay = async () => {
    if (sigPad.current?.isEmpty()) {
      toast.error("Votre signature est requise.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Sécurisation de la transaction...");
    
    try {
        // 1. SIGNATURE DU CONTRAT (Server Action)
        const signatureImage = sigPad.current?.toDataURL('image/png');
        const signResult = await signInvestmentContract(signatureImage);

        if (!signResult.success || !signResult.contractId) {
            throw new Error(signResult.error || "Erreur signature.");
        }

        setIsSigned(true);
        toast.success("Contrat signé et chiffré.", { id: toastId });

        // 2. ✅ PAIEMENT SÉCURISÉ (Server Action)
        // On ne passe PAS le montant ici, juste l'ID du contrat.
        // Le serveur retrouvera le montant réel en base.
        const payResult = await initiateInvestmentPayment(
            signResult.contractId, 
            user.phone || "0700000000"
        );

        if (payResult.success && payResult.paymentUrl) {
            toast.success("Redirection vers le guichet sécurisé...", { id: toastId });
            
            // Petit délai pour l'UX
            setTimeout(() => {
                window.location.href = payResult.paymentUrl;
            }, 1000);
        } else {
            throw new Error(payResult.error || "Erreur initialisation paiement.");
        }

    } catch (error: any) {
        console.error("Flow Error:", error);
        toast.error(error.message || "Une erreur est survenue.", { id: toastId });
        setIsSigned(false); 
    } finally {
        setLoading(false);
    }
  };

  // ... (Le reste du rendu JSX reste identique à votre fichier original) ...
  return (
    // ... (Gardez tout votre JSX actuel) ...
    // Assurez-vous juste que le bouton appelle bien handleSignAndPay
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md">
       {/* ... Contenu visuel inchangé ... */}
       <div className="p-6 border-t border-slate-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500"/>
                <span>Paiement 100% Sécurisé (TLS / Server-Side)</span>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
                <button 
                    onClick={handleSignAndPay}
                    disabled={loading || isSigned}
                    className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold text-white transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5
                        ${isSigned ? 'bg-emerald-600' : 'bg-[#020617] hover:bg-[#0F172A]'}
                    `}
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5"/> : isSigned ? 
                        "Redirection CinetPay..." : 
                        "Signer & Payer"
                    }
                </button>
            </div>
        </div>
        {/* ... */}
    </div>
  );
}
