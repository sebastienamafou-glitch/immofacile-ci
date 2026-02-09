"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Shield, CheckCircle2, Loader2, Camera, Lock, ShieldCheck, XCircle, RefreshCcw, Clock } from "lucide-react";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import { submitKycApplication } from "@/actions/kyc"; 
import Swal from "sweetalert2";

export default function OwnerKYCPage() {
  const [status, setStatus] = useState<string>("NONE"); 
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // ✅ NOUVEAU : State pour le consentement légal
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setStatus(user.kycStatus || "NONE");
        // On récupère le motif s'il existe (stocké lors du login ou refresh user)
        if (user.kycRejectionReason) {
             setRejectionReason(user.kycRejectionReason);
        }
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
      const response = await submitKycApplication(secureUrl, "CNI");
      if (response.error) throw new Error(response.error);

      setStatus("PENDING");
      
      // Mise à jour locale
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.kycStatus = "PENDING";
        user.kycRejectionReason = null; // On nettoie le motif de rejet précédent
        localStorage.setItem('immouser', JSON.stringify(user));
      }

      Swal.fire({
        icon: 'success',
        title: 'Identité transmise',
        text: 'Votre profil propriétaire sera certifié après validation.',
        confirmButtonColor: '#ea580c',
        background: '#0F172A',
        color: '#fff'
      });

    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: "L'envoi a échoué.", background: '#0F172A', color: '#fff' });
    } finally {
      setUploading(false);
    }
  };

  // Fonction pour réinitialiser le formulaire après un rejet
  const handleRetry = () => {
      setStatus("NONE");
      setRejectionReason(null);
      setConsent(false); // On redemande le consentement pour être sûr
  };

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 font-sans pb-24">
      <div className="max-w-3xl mx-auto">
        
        <Link href="/dashboard/owner" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white mb-8">
            <ArrowLeft className="w-4 h-4" /> Retour Dashboard
        </Link>

        <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-black text-white mb-2">Certification Propriétaire</h1>
            <p className="text-slate-400">Pour publier des annonces, nous devons vérifier votre identité.</p>
        </div>

        <div className="bg-[#0F172A] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
            
            <div className="flex items-start gap-5 mb-10 pb-10 border-b border-white/5">
                <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 shrink-0">
                    <Shield className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Badge "Propriétaire Vérifié"</h2>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        Ce badge rassure les locataires et augmente la visibilité de vos annonces.
                        Vos documents sont stockés de manière sécurisée et chiffrée.
                    </p>
                </div>
            </div>

            {/* --- GESTION DES ÉTATS --- */}
            
            {status === 'VERIFIED' ? (
                /* SUCCÈS */
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-10 text-center animate-in zoom-in">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-white">Profil Certifié ✅</h3>
                    <p className="text-emerald-400 mt-2 font-medium">Vous pouvez publier et signer des baux.</p>
                </div>

            ) : status === 'PENDING' ? (
                /* EN ATTENTE */
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-10 text-center animate-pulse">
                    <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-black text-white">Vérification en cours</h3>
                    <p className="text-orange-400 mt-2">Nos administrateurs valident votre pièce d'identité.</p>
                </div>

            ) : status === 'REJECTED' ? (
                /* ❌ NOUVEAU : CAS REJETÉ (Feedback Loop) */
                <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 text-center animate-in shake duration-500">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Dossier Refusé 🛑</h3>
                    
                    <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
                        <p className="text-xs text-red-300 font-bold uppercase mb-1">Motif du refus :</p>
                        <p className="text-white font-medium italic">"{rejectionReason || "Document illisible ou non conforme."}"</p>
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-6">Merci de vérifier la lisibilité du document avant de réessayer.</p>

                    <button 
                        onClick={handleRetry} 
                        className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 mx-auto shadow-lg shadow-red-900/20 active:scale-95"
                    >
                        <RefreshCcw className="w-4 h-4" /> Soumettre un nouveau document
                    </button>
                </div>

            ) : (
                /* FORMULAIRE D'UPLOAD (DÉFAUT) */
                <>
                    {/* ✅ NOUVEAU : CHECKBOX CONSENTEMENT */}
                    <div className="mb-6 flex items-start gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700 transition hover:border-indigo-500/30">
                        <input 
                            type="checkbox" 
                            id="kyc-consent"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer" 
                        />
                        <label htmlFor="kyc-consent" className="text-xs text-slate-400 cursor-pointer select-none leading-relaxed">
                            Je certifie sur l'honneur que les documents fournis sont authentiques. 
                            J'autorise <span className="text-white font-bold">ImmoFacile</span> à traiter ces données pour vérifier mon identité, conformément à la politique de confidentialité.
                        </label>
                    </div>

                    <CldUploadWidget 
                        uploadPreset="immofacile_kyc"
                        onSuccess={handleKycSuccess}
                        options={{ maxFiles: 1, sources: ['local', 'camera'], clientAllowedFormats: ["png", "jpg", "pdf"] }}
                    >
                        {({ open }) => (
                            <div 
                                onClick={() => {
                                    if (consent && !uploading) open();
                                }}
                                className={`
                                    border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all duration-300
                                    ${consent 
                                        ? "border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5 cursor-pointer group" 
                                        : "border-slate-800 bg-slate-900/50 opacity-50 cursor-not-allowed grayscale"
                                    }
                                `}
                            >
                                {uploading ? (
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                                        <p className="text-white font-bold">Envoi sécurisé...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`
                                            w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform
                                            ${consent ? "bg-slate-800 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white" : "bg-slate-800"}
                                        `}>
                                            <Camera className={`w-10 h-10 transition-colors ${consent ? "text-slate-400 group-hover:text-white" : "text-slate-600"}`} />
                                        </div>
                                        <p className="font-bold text-white text-xl">Scanner ma Pièce d'Identité</p>
                                        <p className="text-sm text-slate-500 mt-2">CNI ou Passeport (Recto/Verso)</p>
                                        
                                        {!consent && (
                                            <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-6 animate-pulse">
                                                ⚠️ Cochez la case ci-dessus pour activer
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </CldUploadWidget>
                </>
            )}

            <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-600 uppercase font-bold tracking-widest">
                <Lock className="w-3 h-3" /> Données chiffrées & confidentielles
            </div>
        </div>

        {/* ✅ NOUVEAU : FAQ CONTEXTUELLE */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-10">
            <div>
                <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500"/> Pourquoi cette vérification ?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                    La loi impose de vérifier l'identité des propriétaires pour lutter contre la fraude immobilière. 
                    Cela protège aussi votre compte contre l'usurpation d'identité.
                </p>
            </div>
            <div>
                <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500"/> Combien de temps ça prend ?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                    Notre équipe juridique traite les dossiers sous <strong>2 à 24 heures</strong> ouvrées. 
                    Vous recevrez une notification dès validation.
                </p>
            </div>
        </div>

      </div>
    </div>
  );
}
