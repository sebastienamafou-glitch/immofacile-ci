"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Shield, CheckCircle2, Loader2, Camera, Lock, ShieldCheck, XCircle, RefreshCcw, Clock, FileText } from "lucide-react";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import { submitKycApplication } from "@/actions/kyc"; 
import Swal from "sweetalert2";

export default function OwnerKYCPage() {
  const [status, setStatus] = useState<string>("NONE"); 
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // ✅ NOUVEAUX STATES POUR LA SÉCURITÉ
  const [consent, setConsent] = useState(false);
  const [idNumber, setIdNumber] = useState(""); // Le numéro à chiffrer
  const [idType, setIdType] = useState("CNI");  // Le type de document

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setStatus(user.kycStatus || "NONE");
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
      // ✅ MISE À JOUR : On envoie aussi le numéro et le type
      const response = await submitKycApplication(secureUrl, idType, idNumber);
      
      if (response.error) throw new Error(response.error);

      setStatus("PENDING");
      
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.kycStatus = "PENDING";
        user.kycRejectionReason = null;
        localStorage.setItem('immouser', JSON.stringify(user));
      }

      Swal.fire({
        icon: 'success',
        title: 'Dossier transmis',
        text: 'Votre identité est en cours de chiffrement et validation.',
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

  const handleRetry = () => {
      setStatus("NONE");
      setRejectionReason(null);
      setConsent(false);
      setIdNumber(""); // On reset le numéro
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
                        Vos documents sont stockés de manière <strong>chiffrée (AES-256)</strong>. 
                        Personne, pas même nos développeurs, ne peut lire votre numéro de pièce d'identité sans autorisation.
                    </p>
                </div>
            </div>

            {/* --- GESTION DES ÉTATS --- */}
            
            {status === 'VERIFIED' ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-10 text-center animate-in zoom-in">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-white">Profil Certifié ✅</h3>
                    <p className="text-emerald-400 mt-2 font-medium">Vous pouvez publier et signer des baux.</p>
                </div>

            ) : status === 'PENDING' ? (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-10 text-center animate-pulse">
                    <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-black text-white">Vérification en cours</h3>
                    <p className="text-orange-400 mt-2">Nos administrateurs valident votre pièce d'identité.</p>
                </div>

            ) : status === 'REJECTED' ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 text-center animate-in shake duration-500">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Dossier Refusé 🛑</h3>
                    <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
                        <p className="text-xs text-red-300 font-bold uppercase mb-1">Motif du refus :</p>
                        <p className="text-white font-medium italic">"{rejectionReason || "Document illisible ou non conforme."}"</p>
                    </div>
                    <button onClick={handleRetry} className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 mx-auto">
                        <RefreshCcw className="w-4 h-4" /> Réessayer
                    </button>
                </div>

            ) : (
                /* FORMULAIRE COMPLET */
                <div className="space-y-6">
                    
                    {/* 1. CHOIX DU TYPE DE DOCUMENT */}
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setIdType("CNI")}
                            className={`p-4 rounded-xl border font-bold text-sm transition ${idType === "CNI" ? "bg-indigo-500/20 border-indigo-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"}`}
                        >
                            Carte d'Identité (CNI)
                        </button>
                        <button 
                            onClick={() => setIdType("PASSPORT")}
                            className={`p-4 rounded-xl border font-bold text-sm transition ${idType === "PASSPORT" ? "bg-indigo-500/20 border-indigo-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"}`}
                        >
                            Passeport
                        </button>
                    </div>

                    {/* 2. SAISIE DU NUMÉRO (OBLIGATOIRE POUR L'AUDIT) */}
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block ml-1">Numéro du document (Sera chiffré)</label>
                        <div className="relative">
                            <FileText className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                            <input 
                                type="text" 
                                placeholder={idType === "CNI" ? "Ex: C00123456789" : "Ex: 12AA34567"}
                                value={idNumber}
                                onChange={(e) => setIdNumber(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white font-mono placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                    </div>

                    {/* 3. CONSENTEMENT */}
                    <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700 transition hover:border-indigo-500/30">
                        <input 
                            type="checkbox" 
                            id="kyc-consent"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 cursor-pointer" 
                        />
                        <label htmlFor="kyc-consent" className="text-xs text-slate-400 cursor-pointer select-none leading-relaxed">
                            Je certifie sur l'honneur que les informations sont exactes. 
                            J'autorise <span className="text-white font-bold">ImmoFacile</span> à traiter ces données.
                        </label>
                    </div>

                    {/* 4. ZONE D'UPLOAD (Active uniquement si tout est rempli) */}
                    <CldUploadWidget 
                        uploadPreset="immofacile_kyc"
                        onSuccess={handleKycSuccess}
                        options={{ maxFiles: 1, sources: ['local', 'camera'], clientAllowedFormats: ["png", "jpg", "pdf"] }}
                    >
                        {({ open }) => (
                            <button 
                                onClick={() => {
                                    if (consent && idNumber.length > 3 && !uploading) open();
                                }}
                                disabled={!consent || idNumber.length < 3 || uploading}
                                className={`
                                    w-full border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all duration-300
                                    ${consent && idNumber.length > 3
                                        ? "border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer hover:scale-[1.01]" 
                                        : "border-slate-800 bg-slate-900/50 opacity-50 cursor-not-allowed"
                                    }
                                `}
                            >
                                {uploading ? (
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                                        <p className="text-white font-bold">Chiffrement & Envoi...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-indigo-400">
                                            <Camera className="w-8 h-8" />
                                        </div>
                                        <p className="font-bold text-white text-lg">Scanner ma Pièce</p>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {(!consent || idNumber.length < 3) ? "(Remplissez le formulaire d'abord)" : "Cliquez pour envoyer la photo"}
                                        </p>
                                    </>
                                )}
                            </button>
                        )}
                    </CldUploadWidget>

                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 uppercase font-bold tracking-widest mt-4">
                        <Lock className="w-3 h-3 text-emerald-500" /> Données chiffrées (AES-256)
                    </div>
                </div>
            )}
        </div>

        {/* FAQ */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-10">
            <div>
                <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500"/> Pourquoi cette vérification ?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                    La loi impose de vérifier l'identité des propriétaires. Cela protège aussi votre compte contre l'usurpation.
                </p>
            </div>
            <div>
                <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500"/> Délais de traitement
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                    Traitement sécurisé sous <strong>2 à 24 heures</strong>.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
