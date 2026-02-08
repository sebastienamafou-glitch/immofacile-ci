"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Shield, UserCheck, CheckCircle2, Loader2, Camera, Lock } from "lucide-react";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import { submitKycApplication } from "@/actions/kyc"; // On réutilise la même action !
import Swal from "sweetalert2";

export default function OwnerKYCPage() {
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
      // ✅ On utilise exactement la même fonction serveur que pour les locataires
      const response = await submitKycApplication(secureUrl, "CNI");
      if (response.error) throw new Error(response.error);

      setStatus("PENDING");
      // Mise à jour locale
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.kycStatus = "PENDING";
        localStorage.setItem('immouser', JSON.stringify(user));
      }

      Swal.fire({
        icon: 'success',
        title: 'Identité transmise',
        text: 'Votre profil propriétaire sera certifié après validation.',
        confirmButtonColor: '#ea580c'
      });

    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: "L'envoi a échoué." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 font-sans">
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

            {/* --- ÉTATS DU STATUT --- */}
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
            ) : (
                // --- ZONE D'UPLOAD ---
                <CldUploadWidget 
                    uploadPreset="immofacile_kyc"
                    onSuccess={handleKycSuccess}
                    options={{ maxFiles: 1, sources: ['local', 'camera'], clientAllowedFormats: ["png", "jpg", "pdf"] }}
                >
                    {({ open }) => (
                        <div 
                            onClick={() => !uploading && open()}
                            className="border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer group transition-all"
                        >
                            {uploading ? (
                                <div className="text-center">
                                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                                    <p className="text-white font-bold">Envoi sécurisé...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:bg-indigo-600 group-hover:text-white">
                                        <Camera className="w-10 h-10 text-slate-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <p className="font-bold text-white text-xl">Scanner ma Pièce d'Identité</p>
                                    <p className="text-sm text-slate-500 mt-2">CNI ou Passeport (Recto/Verso)</p>
                                </>
                            )}
                        </div>
                    )}
                </CldUploadWidget>
            )}

            <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-600 uppercase font-bold tracking-widest">
                <Lock className="w-3 h-3" /> Données chiffrées & confidentielles
            </div>
        </div>
      </div>
    </div>
  );
}
