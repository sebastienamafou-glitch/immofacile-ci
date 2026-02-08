"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Shield, FileText, Lock, UserCheck, CheckCircle2, Loader2, Camera } from "lucide-react";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import { submitKycApplication } from "@/actions/kyc";
import Swal from "sweetalert2";

export default function KYCPage() {
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'RENTAL'>('IDENTITY');
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
    const secureUrl = result?.info?.secure_url; // On récupère l'URL directement de Cloudinary

    if (!secureUrl) {
        setUploading(false);
        return;
    }

    try {
      // ON APPELLE LE SERVER ACTION (pas l'API /api/upload)
      const response = await submitKycApplication(secureUrl, "CNI");
      if (response.error) throw new Error(response.error);

      setStatus("PENDING");
      // Mise à jour optimiste locale
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.kycStatus = "PENDING";
        localStorage.setItem('immouser', JSON.stringify(user));
      }

      Swal.fire({
        icon: 'success',
        title: 'Envoyé avec succès !',
        text: 'Votre pièce d\'identité est en cours de validation.',
        background: '#0B1120', color: '#fff',
        confirmButtonColor: '#ea580c'
      });

    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: "L'enregistrement a échoué.", background: '#0B1120', color: '#fff' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/dashboard/tenant/documents" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white mb-8 group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Retour aux documents
        </Link>

        <div className="mb-8">
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2">Mon Dossier Numérique</h1>
            <p className="text-slate-400 text-sm">Gérez vos justificatifs (Identité & Solvabilité) en toute sécurité.</p>
        </div>

        {/* --- ONGLETS (DISTINCTION CLAIRE) --- */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
                onClick={() => setActiveTab('IDENTITY')}
                className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${activeTab === 'IDENTITY' ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-[#0F172A] border-white/5 text-slate-500 hover:bg-white/5'}`}
            >
                <Shield className={`w-8 h-8 ${activeTab === 'IDENTITY' ? 'text-blue-500' : 'text-slate-600'}`} />
                <div className="text-center">
                    <span className="font-bold text-sm block">IDENTITÉ (KYC)</span>
                    <span className="text-[10px] opacity-60">Visible par ImmoFacile (Admin)</span>
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

        {/* --- ONGLET 1 : ADMIN KYC --- */}
        {activeTab === 'IDENTITY' && (
            <div className="bg-[#0F172A] border border-white/5 rounded-[2.5rem] p-8 animate-in fade-in zoom-in duration-300">
                <div className="flex items-start gap-4 mb-8 pb-8 border-b border-white/5">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 shrink-0"><UserCheck className="w-6 h-6" /></div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Vérification d'Identité</h2>
                        <p className="text-sm text-slate-400 mt-2">Pour obtenir le badge <span className="text-blue-400 font-bold">"Vérifié"</span>.</p>
                    </div>
                </div>

                {status === 'VERIFIED' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-white">Identité Validée ✅</h3>
                    </div>
                ) : status === 'PENDING' ? (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-8 text-center">
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                        <h3 className="text-xl font-black text-white">Vérification en cours...</h3>
                    </div>
                ) : (
                    // WIDGET SANS SERVEUR (Évite l'erreur 500)
                    <CldUploadWidget 
                        uploadPreset="immofacile_kyc" // ⚠️ Vérifiez que ce preset existe et est "Unsigned" dans Cloudinary
                        onSuccess={handleKycSuccess}
                        options={{ maxFiles: 1, sources: ['local', 'camera'], clientAllowedFormats: ["png", "jpg", "pdf"] }}
                    >
                        {({ open }) => (
                            <div onClick={() => !uploading && open()} className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer group transition-all">
                                {uploading ? <Loader2 className="animate-spin text-blue-500 w-10 h-10" /> : (
                                    <>
                                        <Camera className="w-10 h-10 text-slate-400 group-hover:text-blue-500 mb-4 transition-colors" />
                                        <p className="text-white font-bold">Scanner ma Pièce d'Identité</p>
                                    </>
                                )}
                            </div>
                        )}
                    </CldUploadWidget>
                )}
            </div>
        )}

        {/* --- ONGLET 2 : PROPRIÉTAIRE --- */}
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
                        <div key={i} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
                            <span className="text-slate-300 text-sm font-medium">{doc}</span>
                            <button className="text-xs font-bold text-purple-500 bg-purple-500/10 px-3 py-1.5 rounded-lg hover:bg-purple-500/20">AJOUTER +</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
