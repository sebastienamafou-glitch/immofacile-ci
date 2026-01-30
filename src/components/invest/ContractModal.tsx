'use client';

import { useState, useRef } from 'react';
import Image from 'next/image'; 
import SignatureCanvas from 'react-signature-canvas';
import { Loader2, Download, Eraser, CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
// On importe la server action sécurisée
import { signInvestmentContract } from '@/lib/actions/contract';
import { initiatePayment } from '@/lib/api';

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
      toast.error("Votre signature est requise pour valider l'acte.");
      return;
    }

    setLoading(true);
    
    try {
        // 1. Capture signature
        const signatureImage = sigPad.current?.toDataURL('image/png');

        // ✅ CORRECTION MAJEURE ICI : 
        // On ne passe plus 'user.id'. La fonction le trouve via le cookie de session.
        const result = await signInvestmentContract(signatureImage);

        // Vérification robuste du résultat
        if (!result.success || !result.contractId) {
            throw new Error(result.error || "Erreur lors de l'enregistrement du contrat.");
        }

        setIsSigned(true);
        toast.success("Contrat signé ! Initialisation du paiement...");

        // 3. DÉCLENCHEMENT PAIEMENT (CinetPay)
        const paymentResult = await initiatePayment({
            type: 'INVESTMENT',
            referenceId: result.contractId,
            phone: user.phone || "0700000000"
        });

        if (paymentResult.success && paymentResult.paymentUrl) {
            // 4. Redirection CinetPay
            window.location.href = paymentResult.paymentUrl;
        } else {
            throw new Error("Impossible de générer le lien de paiement.");
        }

    } catch (error: any) {
        console.error("Erreur Flow:", error);
        toast.error(error.message || "Une erreur est survenue.");
        setIsSigned(false); 
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md">
      <div className="bg-white text-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="relative w-12 h-12"><Image src="/images/logo_webappci.png" alt="WebAppCI" fill className="object-contain" /></div>
            <div className="h-8 w-px bg-slate-300"></div>
             <div className="relative w-24 h-12"><Image src="/images/immo_logo.png" alt="ImmoFacile" fill className="object-contain" /></div>
          </div>
          <div className="text-right hidden md:block">
            <p className="font-bold text-slate-800 text-sm uppercase tracking-wider">Acte d'Investissement</p>
            <p className="text-xs text-slate-500 font-mono">REF: WAPP-INV-{new Date().getFullYear()}-{user.id.slice(-4).toUpperCase()}</p>
          </div>
        </div>

        {/* Corps du Contrat */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 font-serif text-sm leading-relaxed text-slate-800 bg-white">
            <div className="max-w-3xl mx-auto space-y-8">
                
                <div className="text-center border-b-2 border-black pb-6 mb-8">
                  <h1 className="text-2xl md:text-3xl font-black uppercase mb-2">Contrat de Partenariat Financier</h1>
                  <p className="italic text-slate-600">Sous seing privé électronique - Conforme Loi n° 2013-546 (Côte d'Ivoire)</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <p className="mb-4"><strong>ENTRE LES SOUSSIGNÉS :</strong></p>
                  <p className="mb-4 pl-4 border-l-4 border-[#0F172A]">
                    La société <strong>WebAppCI</strong>, Société éditrice de solutions numériques.<br/>
                    Représentée par son Gérant.
                  </p>
                  <p className="mb-4"><strong>ET :</strong></p>
                  <p className="pl-4 border-l-4 border-[#F59E0B]">
                    <strong>M./Mme {user.name}</strong><br/>
                    Identifiant : {user.email}<br/>
                    Ci-après dénommé(e) <em>"L'Investisseur"</em>.
                  </p>
                </div>

                <div className="space-y-6 text-justify">
                    <div>
                        <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500 mb-1">Article 1 : Objet</h3>
                        <p className="mb-2">
                            Le présent contrat a pour objet de formaliser l'apport financier de l'Investisseur au développement de la plateforme immobilière "ImmoFacile", propriété exclusive de WebAppCI.
                        </p>
                        <p>
                            L'Investisseur souscrit par la présente au <strong>"{user.packName}"</strong> pour un montant de <strong>{user.amount.toLocaleString('fr-FR')} FCFA</strong>.
                        </p>
                    </div>
                    
                    <div>
                        <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500 mb-1">Article 2 : Destination des Fonds</h3>
                        <p>
                            Les fonds versés seront affectés exclusivement aux postes suivants : infrastructure technique (serveurs), développement logiciel (IA), marketing digital et expansion régionale de la solution ImmoFacile.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500 mb-1">Article 3 : Preuve et Signature Électronique</h3>
                        <p>
                            Les parties conviennent expressément que le présent contrat est signé par voie électronique. Conformément à la <strong>Loi n° 2013-546 du 30 juillet 2013</strong> relative aux transactions électroniques en Côte d'Ivoire, l'usage de la signature électronique via la plateforme ImmoFacile vaut identification du signataire et manifeste son consentement irrévocable au contenu de l'acte.
                            Les logs de connexion (Adresse IP, Horodatage) conservés par WebAppCI feront foi en cas de litige.
                        </p>
                    </div>

                     <div>
                        <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500 mb-1">Article 4 : Juridiction Compétente</h3>
                        <p>
                            Le présent contrat est régi par le droit ivoirien et les Actes Uniformes de l'OHADA. Tout litige relatif à son interprétation ou son exécution sera soumis à la compétence exclusive du <strong>Tribunal de Commerce d'Abidjan</strong>.
                        </p>
                    </div>
                </div>

                {/* ZONE DE SIGNATURE */}
                <div className="mt-12 p-6 md:p-8 border-2 border-slate-900 rounded-2xl bg-slate-50">
                    <div className="flex items-center justify-center gap-2 mb-6 text-[#F59E0B]">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="font-bold text-sm uppercase tracking-wide">Zone de Consentement Légal</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="opacity-70 pointer-events-none">
                            <p className="font-bold text-xs uppercase mb-3">Pour WebAppCI</p>
                            <div className="h-32 bg-white border border-slate-300 rounded-lg flex items-center justify-center">
                                 <span className="font-script text-2xl text-slate-400">Signé Électroniquement</span>
                            </div>
                        </div>
                        <div>
                             <p className="font-bold text-xs uppercase mb-3 text-[#F59E0B]">Pour L'Investisseur</p>
                             <div className="border-2 border-dashed border-slate-300 bg-white rounded-lg touch-none hover:border-[#F59E0B] transition-colors relative group">
                                <SignatureCanvas 
                                    ref={sigPad}
                                    penColor="black"
                                    velocityFilterWeight={0.7}
                                    canvasProps={{ className: 'sigCanvas w-full h-32 rounded-lg cursor-crosshair' }} 
                                />
                             </div>
                             <div className="flex justify-between items-center mt-2">
                                 <button onClick={clearSignature} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"><Eraser className="w-3 h-3"/> Effacer</button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500"/>
                <span>Paiement sécurisé via CinetPay</span>
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
                        <><CheckCircle className="w-5 h-5"/> Redirection...</> : 
                        "Signer & Payer"
                    }
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
