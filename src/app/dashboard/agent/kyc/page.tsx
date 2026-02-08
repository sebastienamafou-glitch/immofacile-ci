"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck, BadgeCheck, CheckCircle2, Loader2, Camera, Lock, Briefcase, FileCheck } from "lucide-react";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import { submitKycApplication } from "@/actions/kyc";
import Swal from "sweetalert2";

export default function AgentKYCPage() {
  const [status, setStatus] = useState<string>("NONE"); 
  const [uploading, setUploading] = useState(false);

  // Chargement du statut actuel
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
      // ✅ On précise "CARTE_PRO" comme type de document pour les agents
      const response = await submitKycApplication(secureUrl, "CARTE_PRO");
      
      if (response.error) throw new Error(response.error);

      setStatus("PENDING");
      
      // Mise à jour locale pour retour immédiat
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.kycStatus = "PENDING";
        localStorage.setItem('immouser', JSON.stringify(user));
      }

      Swal.fire({
        icon: 'success',
        title: 'Accréditation Transmise',
        text: 'Votre dossier est en cours d\'analyse par la direction.',
        confirmButtonColor: '#2563EB', // Bleu Agent
        background: '#0F172A',
        color: '#fff'
      });

    } catch (error) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Erreur', 
        text: "L'envoi a échoué. Réessayez.",
        background: '#0F172A',
        color: '#fff' 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 lg:p-10 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* RETOUR */}
        <Link href="/dashboard/agent" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour Dashboard
        </Link>

        {/* EN-TÊTE */}
        <div className="mb-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-widest mb-4">
                <BadgeCheck className="w-4 h-4" /> Certification Professionnelle
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Accréditation Agent</h1>
            <p className="text-slate-400 max-w-xl leading-relaxed">
                Pour accéder aux mandats exclusifs et percevoir vos commissions, la loi exige la vérification de votre 
                <span className="text-white font-bold"> Carte Professionnelle</span> ou <span className="text-white font-bold">Attestation de Collaborateur</span>.
            </p>
        </div>

        {/* CARTE PRINCIPALE */}
        <div className="bg-slate-900 border border-blue-500/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            
            {/* Background Effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex items-start gap-6 mb-10 pb-10 border-b border-slate-800 relative z-10">
                <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl text-white shadow-lg shadow-blue-900/50 shrink-0">
                    <Briefcase className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Statut Mandataire</h2>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        Ce statut débloque votre accès à la <strong>Marketplace des Missions</strong> et active votre portefeuille virtuel pour les retraits.
                    </p>
                </div>
            </div>

            {/* --- ÉTATS DU STATUT --- */}
            
            {status === 'VERIFIED' ? (
                // CAS 1 : VÉRIFIÉ (SUCCÈS)
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-10 text-center animate-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">Accréditation Validée ✅</h3>
                    <p className="text-emerald-400 font-medium">Vous êtes officiellement mandataire agréé.</p>
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 font-mono">
                        <Lock className="w-3 h-3" /> ID: AGT-{Math.floor(Math.random() * 10000)}
                    </div>
                </div>

            ) : status === 'PENDING' ? (
                // CAS 2 : EN ATTENTE
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-10 text-center animate-pulse">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Analyse en cours...</h3>
                    <p className="text-blue-400">Notre service juridique vérifie votre document.</p>
                    <p className="text-xs text-slate-500 mt-4">Délai estimé : 24h ouvrées.</p>
                </div>

            ) : (
                // CAS 3 : UPLOAD (DÉFAUT)
                <div className="relative z-10">
                    <CldUploadWidget 
                        uploadPreset="immofacile_kyc"
                        onSuccess={handleKycSuccess}
                        options={{ maxFiles: 1, sources: ['local', 'camera'], clientAllowedFormats: ["png", "jpg", "pdf", "webp"] }}
                    >
                        {({ open }) => (
                            <div 
                                onClick={() => !uploading && open()}
                                className="group border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-blue-500/5 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
                            >
                                {uploading ? (
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                                        <p className="text-white font-bold">Transmission sécurisée...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:bg-blue-600 group-hover:text-white shadow-xl">
                                            <FileCheck className="w-10 h-10 text-slate-400 group-hover:text-white transition-colors" />
                                        </div>
                                        <p className="font-black text-white text-xl mb-2">Téléverser mon Justificatif</p>
                                        <p className="text-sm text-slate-500 text-center max-w-sm">
                                            Carte Professionnelle (Recto/Verso) ou Attestation Employeur. Format PDF ou Photo lisible.
                                        </p>
                                        <button className="mt-8 bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-900/20 group-hover:bg-blue-500 transition">
                                            Sélectionner le fichier
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </CldUploadWidget>
                </div>
            )}

            {/* FOOTER SÉCURITÉ */}
            <div className="mt-8 flex items-center justify-center gap-6 opacity-60">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Conforme Loi Hoguet
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    <Lock className="w-3 h-3 text-blue-500" /> Stockage Chiffré AES-256
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
