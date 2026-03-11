'use client';

import { useState, useRef } from 'react';
import Image from 'next/image'; 
import SignatureCanvas from 'react-signature-canvas';
import { Loader2, Eraser, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { initiateInvestmentPayment } from '@/actions/payment'; 
import { signInvestmentContract } from '@/lib/actions/contract'; 

// ✅ TYPAGE STRICT : Alignement avec la base de données
interface ContractModalProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone?: string | null; 
    amount: number;
    packName: string | null;
  };
  onSuccess: () => void;
  onClose?: () => void; // Ajout recommandé pour pouvoir fermer la modale
}

export default function ContractModal({ user, onSuccess, onClose }: ContractModalProps) {
  const [isSigned, setIsSigned] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ✅ TYPAGE STRICT DE LA REF
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
        // 1. SIGNATURE DU CONTRAT
        const signatureImage = sigPad.current?.toDataURL('image/png') || "";
        const signResult = await signInvestmentContract(signatureImage);

        if (!signResult.success || !signResult.contractId) {
            throw new Error(signResult.error || "Erreur signature.");
        }

        setIsSigned(true);
        toast.success("Contrat signé et chiffré.", { id: toastId });

        // 2. PAIEMENT SÉCURISÉ
        const payResult = await initiateInvestmentPayment(
            signResult.contractId, 
            user.phone || "0700000000"
        );

        if (payResult.success && payResult.paymentUrl) {
            toast.success("Redirection vers le guichet sécurisé...", { id: toastId });
            
            setTimeout(() => {
                window.location.href = payResult.paymentUrl;
            }, 1000);
        } else {
            throw new Error(payResult.error || "Erreur initialisation paiement.");
        }

    } catch (error: unknown) { // ✅ FIN DU ANY
        console.error("Flow Error:", error);
        
        // ✅ GESTION STRICTE DE L'ERREUR
        const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
        
        toast.error(errorMessage, { id: toastId });
        setIsSigned(false); 
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md">
       
       <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative">
           
           {/* -- PLACE TON CONTENU DE CONTRAT ICI (Textes, images, etc.) -- */}
           <div className="p-8 flex-1">
               <h2 className="text-2xl font-bold text-black mb-4">Protocole d'Investissement</h2>
               <p className="text-slate-600 mb-8">Veuillez lire et signer le document ci-dessous pour valider votre apport de {user.amount.toLocaleString()} FCFA.</p>
               
               {/* Zone de Signature */}
               <div className="border-2 border-dashed border-slate-300 rounded-xl p-2 bg-slate-50 relative h-40 mt-8">
                   <SignatureCanvas 
                       ref={sigPad}
                       penColor="black"
                       canvasProps={{ className: "w-full h-full cursor-crosshair" }}
                   />
                   <button 
                       onClick={clearSignature}
                       className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50 transition"
                       title="Effacer la signature"
                   >
                       <Eraser className="w-4 h-4" />
                   </button>
                   <span className="absolute bottom-2 left-4 text-xs font-bold text-slate-400 uppercase tracking-widest pointer-events-none">Signez ici</span>
               </div>
           </div>

           {/* FOOTER ACTIONS */}
           <div className="p-6 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 rounded-b-3xl">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <ShieldCheck className="w-5 h-5 text-emerald-500"/>
                    <span>Paiement 100% Sécurisé (TLS / Server-Side)</span>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    {onClose && (
                        <button 
                            onClick={onClose}
                            disabled={loading || isSigned}
                            className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition"
                        >
                            Annuler
                        </button>
                    )}
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
       </div>
    </div>
  );
}
