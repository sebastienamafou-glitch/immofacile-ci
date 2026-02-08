"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plane, ShieldCheck, CheckCircle2, Loader2, Camera, MapPin, UserCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import { submitKycApplication } from "@/actions/kyc";
import Swal from "sweetalert2";

export default function GuestKYCPage() {
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
      // ✅ On envoie "PASSPORT" ou "CNI" (Identité voyageur)
      const response = await submitKycApplication(secureUrl, "CNI");
      
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
        title: 'Identité Vérifiée !',
        text: 'Vous pouvez désormais effectuer des réservations instantanées.',
        confirmButtonColor: '#06b6d4', // Cyan
        background: '#0F172A',
        color: '#fff'
      });

    } catch (error) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Oups !', 
        text: "L'envoi a échoué. Veuillez réessayer.",
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
        
        {/* NAV */}
        <Link href="/dashboard/guest" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-cyan-400 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour Voyages
        </Link>

        {/* HEADER */}
        <div className="mb-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-900/30 border border-cyan-500/30 text-cyan-300 text-[10px] font-black uppercase tracking-widest mb-4">
                <Plane className="w-3 h-3" /> Passeport Voyageur
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Profil Certifié Akwaba</h1>
            <p className="text-slate-400 max-w-xl leading-relaxed">
                Rejoignez notre communauté de voyageurs de confiance. 
                Vérifiez votre identité pour débloquer la <span className="text-cyan-400 font-bold">Réservation Instantanée</span> sans attente.
            </p>
        </div>

        {/* MAIN CARD */}
        <div className="bg-slate-900 border border-cyan-500/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
            
            {/* Background Travel Vibe */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-600/10 rounded-full blur-[60px] pointer-events-none"></div>

            <div className="flex items-start gap-6 mb-10 pb-10 border-b border-slate-800 relative z-10">
                <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-cyan-900/50 shrink-0">
                    <UserCheck className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Confiance Hôte & Voyageur</h2>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        Les profils vérifiés sont acceptés <strong>3x plus vite</strong> par les propriétaires et bénéficient de l'assurance séjour incluse.
                    </p>
                </div>
            </div>

            {/* --- ÉTATS --- */}
            
            {status === 'VERIFIED' ? (
                // SUCCÈS
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-3xl p-10 text-center animate-in zoom-in duration-500 relative">
                    <div className="absolute top-4 right-4">
                        <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                    </div>
                    <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                        <CheckCircle2 className="w-10 h-10 text-cyan-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">Prêt au décollage ! ✈️</h3>
                    <p className="text-cyan-200 font-medium">Votre identité est validée. Bon voyage !</p>
                </div>

            ) : status === 'PENDING' ? (
                // ATTENTE
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-10 text-center animate-pulse">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Validation en cours...</h3>
                    <p className="text-slate-400">Nous sécurisons votre profil voyageur.</p>
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
                                className="group border-2 border-dashed border-slate-700 hover:border-cyan-500 hover:bg-cyan-500/5 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
                            >
                                {uploading ? (
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
                                        <p className="text-white font-bold">Téléversement...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:bg-cyan-500 group-hover:text-black shadow-xl">
                                            <Camera className="w-10 h-10 text-slate-400 group-hover:text-black transition-colors" />
                                        </div>
                                        <p className="font-black text-white text-xl mb-2">Scanner ma Pièce d'Identité</p>
                                        <p className="text-sm text-slate-500 text-center max-w-sm mb-8">
                                            Passeport ou CNI en cours de validité. 
                                            <br/>Données chiffrées et supprimées après validation.
                                        </p>
                                        <button className="bg-cyan-600 text-white px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-cyan-900/20 group-hover:bg-cyan-500 transition-all active:scale-95 flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4" /> Commencer
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </CldUploadWidget>
                </div>
            )}

            {/* FOOTER */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-6 opacity-60 border-t border-slate-800 pt-6">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    <MapPin className="w-3 h-3 text-cyan-500" /> Partout en Côte d'Ivoire
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Assurance AXA Incluse
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
