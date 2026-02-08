"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, HardHat, FileText, CheckCircle2, Loader2, Camera, ShieldCheck, Hammer, Construction } from "lucide-react";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import { submitKycApplication } from "@/actions/kyc";
import Swal from "sweetalert2";

export default function ArtisanKYCPage() {
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
      // ✅ On précise "KBIS_ARTISAN" pour identifier le type de doc
      const response = await submitKycApplication(secureUrl, "KBIS_ARTISAN");
      
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
        title: 'Documents Transmis',
        text: 'Votre dossier professionnel est en cours de validation technique.',
        confirmButtonColor: '#ea580c', // Orange Artisan
        background: '#0F172A',
        color: '#fff'
      });

    } catch (error) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Échec de l\'envoi', 
        text: "Une erreur est survenue lors du transfert.",
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
        
        {/* HEADER NAV */}
        <Link href="/dashboard/artisan" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-orange-500 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour Chantiers
        </Link>

        {/* TITRE & INTRO */}
        <div className="mb-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-900/30 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <Hammer className="w-3 h-3" /> Qualification Pro
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Certification Artisan</h1>
            <p className="text-slate-400 max-w-xl leading-relaxed">
                Pour intervenir sur nos parcs immobiliers et être payé, vous devez justifier de votre activité (KBIS) et de vos assurances (Décennale/RC Pro).
            </p>
        </div>

        {/* CARTE PRINCIPALE */}
        <div className="bg-slate-900 border border-orange-500/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
            
            {/* Décoration Industrielle */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-800/50 rotate-45 transform translate-y-16 -translate-x-10 pointer-events-none"></div>

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
                // CAS 1 : VÉRIFIÉ
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-10 text-center animate-in zoom-in duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 relative z-10">Dossier Validé ✅</h3>
                    <p className="text-emerald-400 font-medium relative z-10">Vous pouvez accepter des missions.</p>
                </div>

            ) : status === 'PENDING' ? (
                // CAS 2 : EN ATTENTE
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-3xl p-10 text-center animate-pulse">
                    <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Vérification Technique...</h3>
                    <p className="text-orange-400">Nous contrôlons la validité de votre KBIS/Assurance.</p>
                </div>

            ) : (
                // CAS 3 : UPLOAD
                <div className="relative z-10">
                    <CldUploadWidget 
                        uploadPreset="immofacile_kyc"
                        onSuccess={handleKycSuccess}
                        options={{ maxFiles: 1, sources: ['local', 'camera'], clientAllowedFormats: ["png", "jpg", "pdf"] }}
                    >
                        {({ open }) => (
                            <div 
                                onClick={() => !uploading && open()}
                                className="group border-2 border-dashed border-slate-700 hover:border-orange-500 hover:bg-orange-500/5 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
                            >
                                {uploading ? (
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                                        <p className="text-white font-bold">Envoi du dossier...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:bg-orange-600 group-hover:text-white shadow-xl">
                                            <FileText className="w-10 h-10 text-slate-400 group-hover:text-white transition-colors" />
                                        </div>
                                        <p className="font-black text-white text-xl mb-2">Déposer mes justificatifs</p>
                                        <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
                                            Registre de Commerce (KBIS) ou Attestation d'Assurance Décennale.
                                        </p>
                                        <button className="bg-orange-600 text-white px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-orange-900/20 group-hover:bg-orange-500 transition-all active:scale-95 flex items-center gap-2">
                                            <Camera className="w-4 h-4" /> Scanner le document
                                        </button>
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
            </div>

        </div>
      </div>
    </div>
  );
}
