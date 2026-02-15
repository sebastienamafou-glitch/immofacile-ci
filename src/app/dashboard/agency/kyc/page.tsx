"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, Building2, FileText, CheckCircle2, Loader2, UploadCloud, 
  ShieldCheck, Lock, XCircle, RefreshCcw, Briefcase, AlertTriangle, Scale,
  FileBadge
} from "lucide-react";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import { submitKycApplication } from "@/actions/kyc";
import Swal from "sweetalert2";

export default function AgencyKYCPage() {
  const [status, setStatus] = useState<string>("NONE"); 
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ✅ NOUVEAUX STATES POUR LA SÉCURITÉ & CONFORMITÉ KYB
  const [consent, setConsent] = useState(false);
  const [idNumber, setIdNumber] = useState(""); // Le numéro RCCM/NINEA
  const [idType, setIdType] = useState("RCCM"); // Type de document par défaut

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        // On vérifie le statut spécifique agence ou global
        setStatus(user.agencyKycStatus || user.kycStatus || "NONE");
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
      // ✅ Envoi TYPE, URL et NUMÉRO (Sécurisé)
      const response = await submitKycApplication(secureUrl, idType, idNumber);
      
      if (response.error) throw new Error(response.error);

      setStatus("PENDING");
      
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.agencyKycStatus = "PENDING";
        user.kycRejectionReason = null;
        localStorage.setItem('immouser', JSON.stringify(user));
      }

      Swal.fire({
        icon: 'success',
        title: 'Dossier Juridique Transmis',
        text: 'L\'audit de conformité de votre agence démarre maintenant. Vos données sont chiffrées.',
        confirmButtonColor: '#2563EB', // Bleu Corporate
        background: '#0F172A',
        color: '#fff'
      });

    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: "Transmission échouée.", background: '#0F172A', color: '#fff' });
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = () => {
      setStatus("NONE");
      setRejectionReason(null);
      setConsent(false);
      setIdNumber(""); // Reset
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 p-4 lg:p-10 font-sans pb-24">
      <div className="max-w-4xl mx-auto">
        
        {/* NAV */}
        <Link href="/dashboard/agency" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour QG Agence
        </Link>

        {/* HEADER */}
        <div className="mb-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-4">
                <Building2 className="w-3 h-3" /> Certification B2B
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Dossier Juridique Agence</h1>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
                Pour opérer légalement sur la plateforme, votre structure doit justifier de son existence (NINEA / RCCM) et de sa régularité fiscale.
            </p>
        </div>

        {/* MAIN CARD */}
        <div className="bg-slate-900 border border-indigo-500/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
            
            {/* Background Corporate */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] -mr-20 -mt-20 pointer-events-none"></div>

            <div className="flex items-start gap-6 mb-10 pb-10 border-b border-slate-800 relative z-10">
                <div className="p-4 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl text-white shadow-lg shadow-indigo-900/50 shrink-0">
                    <Scale className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Conformité "Know Your Business" (KYB)</h2>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        Ce processus débloque la <strong>facturation automatisée</strong> et le reversement de vos commissions sur compte bancaire professionnel.
                    </p>
                </div>
            </div>

            {/* --- ÉTATS --- */}
            
            {status === 'VERIFIED' ? (
                // SUCCÈS
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-10 text-center animate-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">Agence Certifiée ✅</h3>
                    <p className="text-emerald-400 font-medium">Votre structure est habilitée à exercer.</p>
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 font-mono">
                        <Briefcase className="w-3 h-3" /> LICENCE: AGY-{Math.floor(Math.random() * 10000)}
                    </div>
                </div>

            ) : status === 'PENDING' ? (
                // ATTENTE
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-10 text-center animate-pulse">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Audit Juridique...</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Vérification du NINEA et des statuts auprès du guichet unique.
                    </p>
                </div>

            ) : status === 'REJECTED' ? (
                // ✅ CAS REJETÉ (Feedback Loop)
                <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 text-center animate-in shake duration-500">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Dossier Rejeté 🛑</h3>
                    
                    <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
                        <p className="text-xs text-red-300 font-bold uppercase mb-1">Motif juridique :</p>
                        <p className="text-white font-medium italic">"{rejectionReason || "K-BIS expiré ou illisible."}"</p>
                    </div>
                    
                    <button 
                        onClick={handleRetry} 
                        className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 mx-auto shadow-lg shadow-red-900/20 active:scale-95"
                    >
                        <RefreshCcw className="w-4 h-4" /> Mettre à jour le dossier
                    </button>
                </div>

            ) : (
                // FORMULAIRE D'UPLOAD
                <div className="relative z-10 space-y-6">
                    
                    {/* 1. CHOIX DU DOCUMENT */}
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setIdType("RCCM")}
                            className={`p-4 rounded-xl border font-bold text-sm transition ${idType === "RCCM" ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"}`}
                        >
                            Registre de Commerce (RCCM)
                        </button>
                        <button 
                            onClick={() => setIdType("NINEA")}
                            className={`p-4 rounded-xl border font-bold text-sm transition ${idType === "NINEA" ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"}`}
                        >
                            NINEA / DFE
                        </button>
                    </div>

                    {/* 2. NUMÉRO D'IMMATRICULATION (OBLIGATOIRE) */}
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block ml-1">
                            Numéro d'immatriculation <span className="text-indigo-400">*</span>
                        </label>
                        <div className="relative group">
                            <FileBadge className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input 
                                type="text" 
                                placeholder={idType === "RCCM" ? "Ex: CI-ABJ-2024-B-12345" : "Ex: 0001234567"}
                                value={idNumber}
                                onChange={(e) => setIdNumber(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white font-mono placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1.5 ml-1 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Ce numéro sera chiffré (AES-256) avant stockage.
                        </p>
                    </div>

                    {/* 3. CONSENTEMENT */}
                    <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700 transition hover:border-indigo-500/30">
                        <input 
                            type="checkbox" 
                            id="kyb-consent"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer" 
                        />
                        <label htmlFor="kyb-consent" className="text-xs text-slate-400 cursor-pointer select-none leading-relaxed">
                            Je déclare sur l'honneur être habilité à représenter cette entreprise. 
                            Je certifie l'exactitude des documents légaux fournis.
                        </label>
                    </div>

                    {/* 4. ZONE D'UPLOAD */}
                    <CldUploadWidget 
                        uploadPreset="immofacile_kyc"
                        onSuccess={handleKycSuccess}
                        options={{ maxFiles: 1, sources: ['local', 'camera'], clientAllowedFormats: ["pdf", "jpg", "png"] }}
                    >
                        {({ open }) => (
                            <button 
                                onClick={() => {
                                    if (consent && idNumber.length > 5 && !uploading) open();
                                }}
                                disabled={!consent || idNumber.length < 5 || uploading}
                                className={`
                                    w-full group border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center transition-all duration-300
                                    ${consent && idNumber.length > 5
                                        ? "border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5 cursor-pointer" 
                                        : "border-slate-800 bg-slate-900/50 opacity-50 cursor-not-allowed grayscale"
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
                                        <div className={`
                                            w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-transform
                                            ${consent && idNumber.length > 5 ? "bg-indigo-600 text-white shadow-xl group-hover:scale-110" : "bg-slate-800 text-slate-600"}
                                        `}>
                                            <UploadCloud className="w-8 h-8" />
                                        </div>
                                        <p className="font-black text-white text-lg mb-1">Téléverser le Justificatif</p>
                                        
                                        {(!consent || idNumber.length < 5) ? (
                                            <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest animate-pulse mt-2">
                                                (Remplissez le formulaire d'abord)
                                            </p>
                                        ) : (
                                            <p className="text-xs text-slate-500">Cliquez pour parcourir (PDF/JPG)</p>
                                        )}
                                    </>
                                )}
                            </button>
                        )}
                    </CldUploadWidget>
                </div>
            )}

            {/* FAQ B2B */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-10">
                <div>
                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-indigo-500"/> Pourquoi certifier l'agence ?
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        C'est une obligation légale pour lutter contre les sociétés écrans. Cela vous protège également en cas de litige commercial.
                    </p>
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-500"/> Visibilité accrue ?
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Les agences certifiées apparaissent en tête de liste dans l'annuaire des professionnels et inspirent confiance aux propriétaires bailleurs.
                    </p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
