"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, HardHat, FileText, CheckCircle2, Loader2, Camera, ShieldCheck, Hammer, Construction, XCircle, RefreshCcw, AlertTriangle, Lock } from "lucide-react";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import { submitKycApplication } from "@/actions/kyc";
import { api } from "@/lib/api"; // ✅ IMPORT DE L'AXIOS SÉCURISÉ
import Swal from "sweetalert2";

export default function ArtisanKYCPage() {
  const [status, setStatus] = useState<string>("NONE"); 
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ 1. ÉTATS DE SÉCURITÉ
  const [consent, setConsent] = useState(false);
  const [idNumber, setIdNumber] = useState(""); // Numéro KBIS/NINEA à chiffrer
  const [idType, setIdType] = useState("KBIS_ARTISAN"); // Type par défaut

  // ✅ 2. VÉRIFICATION SERVEUR (ZERO TRUST)
  useEffect(() => {
    const fetchKycStatus = async () => {
      try {
        const res = await api.get('/artisan/kyc');
        if (res.data.success) {
          setStatus(res.data.kyc?.status || "NONE");
          setRejectionReason(res.data.kyc?.rejectionReason || null);
        }
      } catch (e) {
        console.error("Impossible de récupérer le statut KYC", e);
      } finally {
        setLoading(false);
      }
    };
    fetchKycStatus();
  }, []);

  const handleKycSuccess = async (result: any) => {
    setUploading(true);
    const secureUrl = result?.info?.secure_url; 

    if (!secureUrl) {
        setUploading(false);
        return;
    }

    try {
      // ✅ 3. ENVOI SÉCURISÉ AVEC NUMÉRO
      const response = await submitKycApplication(secureUrl, idType, idNumber);
      
      if (response.error) throw new Error(response.error);

      setStatus("PENDING");

      Swal.fire({
        icon: 'success',
        title: 'Dossier Transmis',
        text: 'Votre identification est en cours de chiffrement et validation.',
        confirmButtonColor: '#ea580c',
        background: '#0F172A',
        color: '#fff'
      });

    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: "Échec de l'envoi.", background: '#0F172A', color: '#fff' });
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

  if (loading) {
      return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 lg:p-10 font-sans pb-24">
      <div className="max-w-3xl mx-auto">
        
        <Link href="/dashboard/artisan" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-orange-500 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour Chantiers
        </Link>

        <div className="mb-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-900/30 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <Hammer className="w-3 h-3" /> Qualification Pro
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Certification Artisan</h1>
            <p className="text-slate-400 max-w-xl leading-relaxed">
                Pour intervenir sur nos parcs immobiliers et être payé, vous devez justifier de votre activité (KBIS) et de vos assurances (Décennale/RC Pro).
            </p>
        </div>

        <div className="bg-slate-900 border border-orange-500/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex items-start gap-6 mb-10 pb-10 border-b border-slate-800 relative z-10">
                <div className="p-4 bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl text-white shadow-lg shadow-orange-900/50 shrink-0">
                    <HardHat className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Label "Artisan Agréé"</h2>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        Ce label vous donne la priorité sur les <strong>dépannages d'urgence</strong> et garantit le paiement sous 48h fin de chantier.
                    </p>
                </div>
            </div>

            {/* --- ÉTATS DU STATUT --- */}
            
            {status === 'VERIFIED' ? (
                // SUCCÈS
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-10 text-center animate-in zoom-in duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 relative z-10">Dossier Validé ✅</h3>
                    <p className="text-emerald-400 font-medium relative z-10">Vous êtes habilité à intervenir.</p>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 font-mono relative z-10">
                        <Lock className="w-3 h-3" /> ID: ART-{Math.floor(Math.random() * 10000)}
                    </div>
                </div>

            ) : status === 'PENDING' ? (
                // EN ATTENTE
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-3xl p-10 text-center animate-pulse">
                    <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Vérification Technique...</h3>
                    <p className="text-orange-400">Contrôle de validité KBIS/Assurance en cours.</p>
                </div>

            ) : status === 'REJECTED' ? (
                // CAS 3 : REJETÉ
                <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 text-center animate-in shake duration-500">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Certification Refusée 🛑</h3>
                    
                    <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
                        <p className="text-xs text-red-300 font-bold uppercase mb-1">Motif du refus :</p>
                        <p className="text-white font-medium italic">"{rejectionReason || "Document incomplet ou expiré."}"</p>
                    </div>
                    
                    <button 
                        onClick={handleRetry} 
                        className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 mx-auto shadow-lg shadow-red-900/20 active:scale-95"
                    >
                        <RefreshCcw className="w-4 h-4" /> Soumettre un nouveau document
                    </button>
                </div>

            ) : (
                // CAS 4 : UPLOAD
                <div className="relative z-10">
                    
                    {/* ✅ CHAMP DE SAISIE */}
                    <div className="mb-6">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-1 tracking-widest">
                            Numéro d'immatriculation (SIRET / NINEA) <span className="text-orange-500">*</span>
                        </label>
                        <div className="relative group">
                            <FileText className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Ex: CI-ABJ-2024-A-12345"
                                value={idNumber}
                                onChange={(e) => setIdNumber(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white font-mono placeholder-slate-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                    </div>

                    {/* ✅ CONSENTEMENT */}
                    <div className="mb-6 flex items-start gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700 transition hover:border-orange-500/30">
                        <input 
                            type="checkbox" 
                            id="kyc-consent"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500/50 cursor-pointer" 
                        />
                        <label htmlFor="kyc-consent" className="text-xs text-slate-400 cursor-pointer select-none leading-relaxed">
                            Je certifie sur l'honneur que mon entreprise est à jour de ses cotisations et assurances. 
                            J'autorise <span className="text-white font-bold">Babimmo</span> à chiffrer et vérifier ces pièces.
                        </label>
                    </div>

                    <CldUploadWidget 
                        uploadPreset="babimmo_kyc"
                        onSuccess={handleKycSuccess}
                        options={{ maxFiles: 1, sources: ['local', 'camera'], clientAllowedFormats: ["png", "jpg", "pdf"] }}
                    >
                        {({ open }) => (
                            <div 
                                onClick={() => {
                                    if (consent && idNumber.length > 5 && !uploading) open();
                                }}
                                className={`
                                    group border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all duration-300
                                    ${consent && idNumber.length > 5
                                        ? "border-slate-700 hover:border-orange-500 hover:bg-orange-500/5 cursor-pointer" 
                                        : "border-slate-800 bg-slate-900/50 opacity-50 cursor-not-allowed grayscale"
                                    }
                                `}
                            >
                                {uploading ? (
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                                        <p className="text-white font-bold">Envoi sécurisé...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`
                                            w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform
                                            ${consent && idNumber.length > 5 ? "bg-slate-800 group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white shadow-xl" : "bg-slate-800"}
                                        `}>
                                            <Camera className={`w-10 h-10 transition-colors ${consent && idNumber.length > 5 ? "text-slate-400 group-hover:text-white" : "text-slate-600"}`} />
                                        </div>
                                        <p className="font-black text-white text-xl mb-2">Scanner mes justificatifs</p>
                                        <p className="text-sm text-slate-500 text-center max-w-sm">
                                            Registre de Commerce (KBIS) ou Attestation d'Assurance.
                                        </p>

                                        {(!consent || idNumber.length <= 5) && (
                                            <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-6 animate-pulse">
                                                ⚠️ Remplissez le NINEA et cochez la case
                                            </p>
                                        )}

                                        {consent && idNumber.length > 5 && (
                                            <button className="mt-8 bg-orange-600 text-white px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-orange-900/20 group-hover:bg-orange-500 transition-all active:scale-95 flex items-center gap-2">
                                                <Camera className="w-4 h-4" /> Sélectionner le fichier
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </CldUploadWidget>
                </div>
            )}

            {/* FOOTER INFO */}
            <div className="mt-8 flex items-center justify-center gap-6 opacity-60 border-t border-slate-800 pt-6">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Assurance Validée
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    <Construction className="w-3 h-3 text-blue-500" /> Normes RGE
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    <Lock className="w-3 h-3 text-orange-500" /> AES-256
                </div>
            </div>

            {/* FAQ */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-10">
                <div>
                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500"/> Assurance Obligatoire ?
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Oui. En cas de sinistre sur un chantier, c'est votre assurance Décennale ou RC Pro qui protège le client et vous-même.
                    </p>
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-500"/> Avantages Certifiés
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Les artisans certifiés sont payés 2x plus vite (sous 48h) et reçoivent les notifications de chantier 1h avant les autres.
                    </p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
