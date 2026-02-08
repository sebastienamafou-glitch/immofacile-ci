"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Landmark, ShieldCheck, Lock, CheckCircle2, Loader2, UploadCloud, FileText, PieChart, Coins } from "lucide-react";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import { submitKycApplication } from "@/actions/kyc";
import Swal from "sweetalert2";

export default function InvestorKYCPage() {
  const [status, setStatus] = useState<string>("NONE"); 
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setStatus(user.kycStatus || "NONE");
      }
    } catch (e) { console.error(e); }
  }, []);

  const handleKycSuccess = async (result: any) => {
    setUploading(true);
    const secureUrl = result?.info?.secure_url; 

    if (!secureUrl) {
        setUploading(false);
        return;
    }

    try {
      // ✅ Type spécifique "KYC_INVESTOR" pour le traitement prioritaire
      const response = await submitKycApplication(secureUrl, "KYC_INVESTOR");
      
      if (response.error) throw new Error(response.error);

      setStatus("PENDING");
      
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.kycStatus = "PENDING";
        localStorage.setItem('immouser', JSON.stringify(user));
      }

      Swal.fire({
        icon: 'success',
        title: 'Dossier Transmis',
        text: 'Votre profil est en cours d\'analyse par notre pôle conformité.',
        confirmButtonColor: '#d97706', // Amber-600
        background: '#0F172A',
        color: '#fff'
      });

    } catch (error) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Erreur', 
        text: "Échec de la transmission sécurisée.",
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 lg:p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* NAV */}
        <Link href="/dashboard/investor" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-amber-500 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour Portefeuille
        </Link>

        {/* HEADER */}
        <div className="mb-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/30 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <Landmark className="w-3 h-3" /> Conformité Financière
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Accréditation Investisseur</h1>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
                Conformément aux réglementations internationales de lutte contre le blanchiment (AML/CFT), 
                nous devons valider votre identité pour débloquer les <span className="text-amber-500 font-bold">Investissements High-Yield</span> (&gt; 1M FCFA).
            </p>
        </div>

        {/* MAIN CARD */}
        <div className="bg-slate-900 border border-amber-500/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
            
            {/* Background Premium */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-slate-800/50 rotate-12 transform translate-y-16 -translate-x-10 pointer-events-none"></div>

            <div className="flex items-start gap-6 mb-10 pb-10 border-b border-slate-800 relative z-10">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl text-white shadow-lg shadow-amber-900/50 shrink-0">
                    <PieChart className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Cercle Privé "Immo-Club"</h2>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        L'accréditation vous donne accès aux projets confidentiels, aux rendements bonifiés et à un gestionnaire de compte dédié.
                    </p>
                </div>
            </div>

            {/* --- ÉTATS --- */}
            
            {status === 'VERIFIED' ? (
                // SUCCÈS - GOLD STATUS
                <div className="bg-gradient-to-b from-slate-900 to-amber-900/10 border border-amber-500/30 rounded-3xl p-10 text-center animate-in zoom-in duration-500 relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/20 relative z-10">
                        <ShieldCheck className="w-12 h-12 text-black" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-2 relative z-10 tracking-tight">Investisseur Accrédité</h3>
                    <p className="text-amber-400 font-bold uppercase tracking-widest text-xs relative z-10">Niveau : Platinum</p>
                    <div className="mt-8 grid grid-cols-2 gap-4 max-w-sm mx-auto relative z-10">
                         <div className="bg-black/30 p-3 rounded-xl border border-amber-500/20">
                            <p className="text-[10px] text-slate-400 uppercase">Plafond</p>
                            <p className="text-white font-bold">Illimité</p>
                         </div>
                         <div className="bg-black/30 p-3 rounded-xl border border-amber-500/20">
                            <p className="text-[10px] text-slate-400 uppercase">Frais</p>
                            <p className="text-white font-bold">Réduits</p>
                         </div>
                    </div>
                </div>

            ) : status === 'PENDING' ? (
                // ATTENTE - COMPLIANCE
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-10 text-center animate-pulse">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Analyse Compliance...</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Nos experts vérifient la conformité de vos documents avec les normes en vigueur (BCEAO/Tracfin).
                    </p>
                </div>

            ) : (
                // UPLOAD
                <div className="relative z-10">
                    <CldUploadWidget 
                        uploadPreset="immofacile_kyc"
                        onSuccess={handleKycSuccess}
                        options={{ maxFiles: 1, sources: ['local', 'camera'], clientAllowedFormats: ["png", "jpg", "pdf"] }}
                    >
                        {({ open }) => (
                            <div 
                                onClick={() => !uploading && open()}
                                className="group border-2 border-dashed border-slate-700 hover:border-amber-500 hover:bg-amber-500/5 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
                            >
                                {uploading ? (
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
                                        <p className="text-white font-bold">Chiffrement SSL en cours...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:bg-amber-500 group-hover:text-black shadow-xl">
                                            <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-black transition-colors" />
                                        </div>
                                        <p className="font-black text-white text-xl mb-2">Soumettre mon Dossier</p>
                                        <p className="text-sm text-slate-500 text-center max-w-md mb-8">
                                            Veuillez fournir une <span className="text-white">Pièce d'Identité</span> (Passeport/CNI) ou un <span className="text-white">Justificatif de Fonds</span> si demandé.
                                        </p>
                                        <button className="bg-gradient-to-r from-amber-600 to-yellow-600 text-black px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-900/30 group-hover:shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> Sélectionner le document
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </CldUploadWidget>
                </div>
            )}

            {/* FOOTER INFO */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-6 opacity-60 border-t border-slate-800 pt-6">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    <Lock className="w-3 h-3 text-amber-500" /> Données Bancaires Sécurisées
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    <Coins className="w-3 h-3 text-white" /> Audit Annuel
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
