"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Camera, UploadCloud, CheckCircle2, 
  AlertCircle, Loader2, ArrowLeft, Shield 
} from "lucide-react";
import Swal from "sweetalert2";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function KYCPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string>("PENDING"); // PENDING, VERIFIED, REJECTED, NONE

  // On vérifie le statut actuel au chargement
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get('/tenant/dashboard');
        if (res.data.user) {
            // Suppose que votre User a un champ kycStatus
            setStatus(res.data.user.kycStatus || "NONE");
        }
      } catch (e) { console.error(e); }
    };
    checkStatus();
  }, []);

  // Gestion de la sélection de fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  // Envoi vers le Backend
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    // ⚠️ IMPORTANT : Le nom 'document' doit correspondre à upload.single('document') dans kycRoutes.js
    formData.append('document', file); 

    try {
      // Appel de votre route Backend
      await api.post('/kyc/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setStatus("PENDING");
      
      Swal.fire({
        icon: 'success',
        title: 'Envoyé !',
        text: 'Votre document est en cours de validation par nos services.',
        background: '#0B1120', color: '#fff'
      });

    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: "L'envoi a échoué. Vérifiez que le fichier n'est pas trop lourd.",
        background: '#0B1120', color: '#fff'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 font-sans">
      
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/tenant" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white mb-8 group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Retour
        </Link>

        <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                <Shield className="w-7 h-7" />
            </div>
            <div>
                <h1 className="text-3xl font-black text-white tracking-tighter">Vérification d'Identité</h1>
                <p className="text-slate-500 text-sm mt-1">Conformité KYC (Know Your Customer)</p>
            </div>
        </div>

        {/* ÉTAT : DÉJÀ VÉRIFIÉ */}
        {status === 'VERIFIED' && (
             <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-8 text-center">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Identité Validée</h2>
                <p className="text-emerald-400 font-medium">Votre dossier est complet et conforme.</p>
             </div>
        )}

        {/* ÉTAT : EN ATTENTE */}
        {status === 'PENDING' && (
             <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2rem] p-8 text-center">
                <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <Loader2 className="w-10 h-10 text-orange-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Vérification en cours</h2>
                <p className="text-orange-400 font-medium">Nos équipes analysent votre document.</p>
             </div>
        )}

        {/* ÉTAT : NON SOUMIS (Formulaire) */}
        {(status === 'NONE' || status === 'REJECTED') && (
            <div className="bg-[#0F172A] border border-white/5 rounded-[2.5rem] p-8 shadow-xl">
                
                <div className="text-center mb-8">
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Pour finaliser votre dossier de location, veuillez télécharger une photo claire de votre 
                        <strong className="text-white"> Carte Nationale d'Identité (CNI)</strong> ou <strong className="text-white">Passeport</strong>.
                    </p>
                </div>

                {/* ZONE D'UPLOAD */}
                <div className="relative group cursor-pointer">
                    <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                    />
                    
                    <div className={`border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all ${preview ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 hover:border-slate-500 hover:bg-white/5'}`}>
                        {preview ? (
                            <img src={preview} alt="Aperçu" className="max-h-64 rounded-xl shadow-lg object-contain" />
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Camera className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="font-bold text-white text-lg">Appuyez pour ajouter une photo</p>
                                <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">JPG, PNG ou PDF (Max 5Mo)</p>
                            </>
                        )}
                    </div>
                </div>

                {file && (
                    <Button 
                        onClick={handleUpload} 
                        disabled={uploading}
                        className="w-full mt-6 h-16 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-lg shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all"
                    >
                        {uploading ? (
                            <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> Envoi...</span>
                        ) : (
                            <span className="flex items-center gap-2"><UploadCloud /> ENVOYER LE DOCUMENT</span>
                        )}
                    </Button>
                )}
            </div>
        )}

      </div>
    </div>
  );
}
