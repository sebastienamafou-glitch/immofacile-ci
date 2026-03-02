"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Shield, FileText, UserCheck, CheckCircle2, Loader2, Camera, Lock, XCircle, RefreshCcw, ShieldCheck, HelpCircle } from "lucide-react";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import { submitKycApplication, getLiveKycStatus } from "@/actions/kyc"; 
import Swal from "sweetalert2";
import confetti from "canvas-confetti";

export default function TenantKYCPage() {
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'RENTAL'>('IDENTITY');
  const [status, setStatus] = useState<string>("NONE"); 
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // ✅ NOUVEAUX STATES POUR LA SÉCURITÉ
  const [consent, setConsent] = useState(false);
  const [idNumber, setIdNumber] = useState(""); // Le numéro à chiffrer
  const [idType, setIdType] = useState("CNI");  // Le type de document

  // 1. CHARGEMENT INITIAL
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setStatus(user.kycStatus || "NONE");
        if (user.kycRejectionReason) setRejectionReason(user.kycRejectionReason);
      }
    } catch (e) { console.error(e); }
  }, []);

  // 2. ⚡️ POLLING TEMPS RÉEL
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === 'PENDING') {
        interval = setInterval(async () => {
            const freshData = await getLiveKycStatus();
            
            if (freshData && freshData.status !== 'PENDING') {
                setStatus(freshData.status);
                setRejectionReason(freshData.rejectionReason || null);

                const storedUser = localStorage.getItem('immouser');
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    user.kycStatus = freshData.status;
                    user.isVerified = freshData.isVerified;
                    user.kycRejectionReason = freshData.rejectionReason;
                    localStorage.setItem('immouser', JSON.stringify(user));
                }

                if (freshData.status === 'VERIFIED') {
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                    Swal.fire({
                        icon: 'success',
                        title: 'Félicitations ! 🥳',
                        text: 'Votre identité vient d\'être validée.',
                        timer: 4000,
                        showConfirmButton: false,
                        background: '#0F172A', color: '#fff'
                    });
                } else if (freshData.status === 'REJECTED') {
                     Swal.fire({
                        icon: 'error',
                        title: 'Mise à jour Dossier',
                        text: 'Votre document a été refusé.',
                        background: '#0F172A', color: '#fff'
                    });
                }
            }
        }, 5000); 
    }

    return () => clearInterval(interval); 
  }, [status]);


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
        title: 'Envoyé avec succès !',
        text: 'Votre identité est en cours de chiffrement et validation.',
        background: '#0B1120', color: '#fff',
        confirmButtonColor: '#ea580c'
      });

    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: "L'enregistrement a échoué.", background: '#0B1120', color: '#fff' });
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = () => {
      setStatus("NONE");
      setRejectionReason(null);
      setConsent(false);
      setIdNumber(""); // On reset
  };

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 font-sans pb-24">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/dashboard/tenant" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white mb-8 group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Retour Dashboard
        </Link>

        <div className="mb-8">
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2">Mon Dossier Numérique</h1>
            <p className="text-slate-400 text-sm">Gérez vos justificatifs (Identité & Solvabilité) en toute sécurité.</p>
        </div>

        {/* --- ONGLETS --- */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
                onClick={() => setActiveTab('IDENTITY')}
                className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${activeTab === 'IDENTITY' ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-[#0F172A] border-white/5 text-slate-500 hover:bg-white/5'}`}
            >
                <Shield className={`w-8 h-8 ${activeTab === 'IDENTITY' ? 'text-blue-500' : 'text-slate-600'}`} />
                <div className="text-center">
                    <span className="font-bold text-sm block">IDENTITÉ (KYC)</span>
                    <span className="text-[10px] opacity-60">Visible par Babimmo (Admin)</span>
                </div>
            </button>

            <button 
                onClick={() => setActiveTab('RENTAL')}
                className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${activeTab === 'RENTAL' ? 'bg-purple-600/10 border-purple-500 text-white shadow-lg shadow-purple-900/20' : 'bg-[#0F172A] border-white/5 text-slate-500 hover:bg-white/5'}`}
            >
                <FileText className={`w-8 h-8 ${activeTab === 'RENTAL' ? 'text-purple-500' : 'text-slate-600'}`} />
                <div className="text-center">
                    <span className="font-bold text-sm block">DOSSIER LOCATIF</span>
                    <span className="text-[10px] opacity-60">Visible par les Propriétaires</span>
                </div>
            </button>
        </div>

        {/* --- ONGLET 1 : ADMIN KYC (LIVE UPDATE) --- */}
        {activeTab === 'IDENTITY' && (
            <div className="bg-[#0F172A] border border-white/5 rounded-[2.5rem] p-8 animate-in fade-in zoom-in duration-300">
                <div className="flex items-start gap-4 mb-8 pb-8 border-b border-white/5">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 shrink-0"><UserCheck className="w-6 h-6" /></div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Vérification d'Identité</h2>
                        <p className="text-sm text-slate-400 mt-2">Pour obtenir le badge <span className="text-blue-400 font-bold">"Vérifié"</span> et rassurer les propriétaires.</p>
                    </div>
                </div>

                {status === 'VERIFIED' ? (
                    // CAS 1 : VÉRIFIÉ
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center animate-in zoom-in">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-white">Identité Validée ✅</h3>
                        <p className="text-emerald-400 mt-2 font-medium">Votre badge de confiance est actif.</p>
                    </div>

                ) : status === 'PENDING' ? (
                    // CAS 2 : EN ATTENTE (LIVE)
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-8 text-center animate-pulse">
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                        <h3 className="text-xl font-black text-white">Vérification en cours...</h3>
                        <p className="text-orange-400 mt-2">Nous analysons votre document en direct.</p>
                    </div>

                ) : status === 'REJECTED' ? (
                    // CAS 3 : REJETÉ
                    <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 text-center animate-in shake duration-500">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <XCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">Pièce Refusée 🛑</h3>
                        <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
                            <p className="text-xs text-red-300 font-bold uppercase mb-1">Motif du rejet :</p>
                            <p className="text-white font-medium italic">"{rejectionReason || "Photo floue ou document expiré."}"</p>
                        </div>
                        <button onClick={handleRetry} className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 mx-auto">
                            <RefreshCcw className="w-4 h-4" /> Soumettre à nouveau
                        </button>
                    </div>

                ) : (
                    // CAS 4 : FORMULAIRE COMPLET
                    <div className="space-y-6">
                        
                        {/* 1. TYPE DE DOCUMENT */}
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setIdType("CNI")}
                                className={`p-4 rounded-xl border font-bold text-sm transition ${idType === "CNI" ? "bg-blue-500/20 border-blue-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"}`}
                            >
                                Carte d'Identité (CNI)
                            </button>
                            <button 
                                onClick={() => setIdType("PASSPORT")}
                                className={`p-4 rounded-xl border font-bold text-sm transition ${idType === "PASSPORT" ? "bg-blue-500/20 border-blue-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"}`}
                            >
                                Passeport
                            </button>
                        </div>

                        {/* 2. NUMÉRO DU DOCUMENT */}
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-2 block ml-1">Numéro du document (Sera chiffré)</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder={idType === "CNI" ? "Ex: C00123456789" : "Ex: 12AA34567"}
                                    value={idNumber}
                                    onChange={(e) => setIdNumber(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white font-mono placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                />
                            </div>
                        </div>

                        {/* 3. CONSENTEMENT */}
                        <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700 transition hover:border-blue-500/30">
                            <input 
                                type="checkbox" 
                                id="kyc-consent"
                                checked={consent}
                                onChange={(e) => setConsent(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500/50 cursor-pointer" 
                            />
                            <label htmlFor="kyc-consent" className="text-xs text-slate-400 cursor-pointer select-none leading-relaxed">
                                Je certifie que les informations fournies sont exactes. 
                                J'accepte qu'Babimmo vérifie mon identité pour sécuriser les locations.
                            </label>
                        </div>

                        {/* 4. UPLOAD */}
                        <CldUploadWidget 
                            uploadPreset="babimmo_kyc"
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
                                        w-full border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-300
                                        ${consent && idNumber.length > 3
                                            ? "border-slate-700 hover:border-blue-500 cursor-pointer group bg-transparent hover:scale-[1.01]" 
                                            : "border-slate-800 bg-slate-900/50 opacity-50 cursor-not-allowed grayscale"
                                        }
                                    `}
                                >
                                    {uploading ? (
                                        <div className="text-center">
                                            <Loader2 className="animate-spin text-blue-500 w-10 h-10 mx-auto mb-2" />
                                            <p className="text-white font-bold">Chiffrement & Envoi...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Camera className={`w-10 h-10 mb-4 transition-colors ${consent ? "text-slate-400 group-hover:text-blue-500" : "text-slate-600"}`} />
                                            <p className="text-white font-bold">Scanner ma Pièce d'Identité</p>
                                            
                                            {(!consent || idNumber.length < 3) && (
                                                <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-4">
                                                    (Remplissez le formulaire d'abord)
                                                </p>
                                            )}
                                        </>
                                    )}
                                </button>
                            )}
                        </CldUploadWidget>

                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-8">
                            <div>
                                <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                                    <Lock className="w-3 h-3 text-emerald-500"/> Données Chiffrées (AES-256)
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Seuls nos administrateurs voient votre CNI pour la validation. 
                                    Les propriétaires voient uniquement le badge vert "Vérifié".
                                </p>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        )}

        {/* --- ONGLET 2 : PROPRIÉTAIRE (Inchangé) --- */}
        {activeTab === 'RENTAL' && (
            <div className="bg-[#0F172A] border border-white/5 rounded-[2.5rem] p-8 animate-in fade-in zoom-in duration-300">
                <div className="flex items-start gap-4 mb-8 pb-8 border-b border-white/5">
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 shrink-0"><Lock className="w-6 h-6" /></div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Justificatifs de Solvabilité</h2>
                        <p className="text-sm text-slate-400 mt-2">Documents partagés uniquement sur candidature.</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {['Bulletins de Salaire', 'Contrat de Travail', 'Avis d\'Imposition'].map((doc, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl hover:border-purple-500/30 transition">
                            <span className="text-slate-300 text-sm font-medium">{doc}</span>
                            <button className="text-xs font-bold text-purple-500 bg-purple-500/10 px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition">AJOUTER +</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
