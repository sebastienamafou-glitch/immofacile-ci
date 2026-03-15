"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, TrendingUp, CheckCircle2, Loader2, 
  Landmark, Wallet, XCircle, RefreshCcw, FileText, Globe, AlertOctagon, ShieldCheck 
} from "lucide-react";
import Link from "next/link";
// ❌ On supprime Cloudinary
// import { CldUploadWidget } from "next-cloudinary"; 
import { submitKycApplication } from "@/actions/kyc";
import Swal from "sweetalert2";
// ✅ On importe le composant S3 Sécurisé
import SecureDocumentUpload from "@/components/shared/SecureDocumentUpload"; 
import { toast } from "sonner";

export default function InvestorKYCPage() {
  const [status, setStatus] = useState<string>("NONE"); 
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ✅ SÉCURITÉ & CONFORMITÉ FINANCIÈRE
  const [consent, setConsent] = useState(false);
  const [idNumber, setIdNumber] = useState(""); 
  const [idType, setIdType] = useState("PASSPORT"); 
  const [documentKey, setDocumentKey] = useState<string>(""); // Clé S3 privée

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

  const handleFinalSubmit = async () => {
    if (!documentKey) return toast.error("Veuillez uploader le document d'abord.");
    if (!idNumber || idNumber.length < 5) return toast.error("Numéro de document invalide.");
    
    setSubmitting(true);
    const toastId = toast.loading("Chiffrement et transmission du dossier...");

    try {
      // ✅ ENVOI SÉCURISÉ (Conformité LCB-FT)
      // On envoie la clé S3 (documentKey) au lieu d'une URL publique
      const response = await submitKycApplication(documentKey, idType, idNumber);
      
      if (response.error) throw new Error(response.error);

      setStatus("PENDING");
      
      // Mise à jour cache local
      const storedUser = localStorage.getItem('immouser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.kycStatus = "PENDING";
        user.kycRejectionReason = null;
        localStorage.setItem('immouser', JSON.stringify(user));
      }

      toast.success("Dossier transmis aux services de conformité.", { id: toastId });

      Swal.fire({
        icon: 'success',
        title: 'Dossier Reçu',
        text: 'Vérification Anti-Blanchiment (AML) en cours. Vos documents sont stockés dans un coffre-fort numérique.',
        confirmButtonColor: '#d97706',
        background: '#0F172A',
        color: '#fff'
      });

    } catch (error: any) {
      toast.error(error.message || "Erreur d'envoi", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
      setStatus("NONE");
      setRejectionReason(null);
      setConsent(false);
      setIdNumber(""); 
      setDocumentKey("");
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 lg:p-10 font-sans pb-24">
      <div className="max-w-3xl mx-auto">
        
        {/* NAV */}
        <Link href="/dashboard/investor" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-amber-500 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour Portefeuille
        </Link>

        {/* HEADER */}
        <div className="mb-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/30 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <TrendingUp className="w-3 h-3" /> Accréditation Investisseur
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Cercle d'Investissement</h1>
            <p className="text-slate-400 max-w-xl leading-relaxed">
                Pour accéder aux opportunités à haut rendement, la réglementation financière nous impose de valider votre identité (KYC/AML).
            </p>
        </div>

        {/* MAIN CARD */}
        <div className="bg-slate-900 border border-amber-500/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
            
            {/* Background Luxe */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>

            <div className="flex items-start gap-6 mb-10 pb-10 border-b border-slate-800 relative z-10">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl text-white shadow-lg shadow-amber-900/50 shrink-0">
                    <Landmark className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Débloquez votre Wallet</h2>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        L'identité vérifiée permet d'activer les **dépôts illimités** et les retraits vers votre compte bancaire.
                    </p>
                </div>
            </div>

            {/* --- ÉTATS --- */}
            
            {status === 'VERIFIED' ? (
                // SUCCÈS
                <div className="bg-gradient-to-br from-amber-500/10 to-yellow-600/10 border border-amber-500/30 rounded-3xl p-10 text-center animate-in zoom-in duration-500 relative">
                    <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                        <CheckCircle2 className="w-10 h-10 text-amber-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">Investisseur Accrédité 🌟</h3>
                    <p className="text-amber-200 font-medium">Vous avez accès à toutes les opportunités.</p>
                </div>

            ) : status === 'PENDING' ? (
                // ATTENTE
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-10 text-center animate-pulse">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Conformité en cours...</h3>
                    <p className="text-slate-400">Vérification des listes de sanctions & PEP.</p>
                </div>

            ) : status === 'REJECTED' ? (
                // REJETÉ
                <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 text-center animate-in shake duration-500">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Accréditation Refusée 🛑</h3>
                    <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
                        <p className="text-white font-medium italic">"{rejectionReason || "Document expiré ou illisible."}"</p>
                    </div>
                    <button onClick={handleRetry} className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 mx-auto shadow-lg">
                        <RefreshCcw className="w-4 h-4" /> Nouvelle tentative
                    </button>
                </div>

            ) : (
                // FORMULAIRE DE SOUMISSION
                <div className="relative z-10">
                    
                    {/* ✅ 1. CHOIX TYPE */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                            onClick={() => setIdType("PASSPORT")}
                            className={`p-4 rounded-xl border font-bold text-sm transition flex flex-col items-center gap-2 ${idType === "PASSPORT" ? "bg-amber-900/40 border-amber-500 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"}`}
                        >
                            <Globe className="w-5 h-5" /> Passeport
                        </button>
                        <button 
                            onClick={() => setIdType("CNI")}
                            className={`p-4 rounded-xl border font-bold text-sm transition flex flex-col items-center gap-2 ${idType === "CNI" ? "bg-amber-900/40 border-amber-500 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"}`}
                        >
                            <FileText className="w-5 h-5" /> CNI
                        </button>
                    </div>

                    {/* ✅ 2. NUMÉRO DOCUMENT */}
                    <div className="mb-6">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-1 tracking-widest">
                            Numéro du document <span className="text-amber-500">*</span>
                        </label>
                        <div className="relative group">
                            <FileText className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder={idType === "PASSPORT" ? "Ex: 12AA34567" : "Ex: C00123456789"}
                                value={idNumber}
                                onChange={(e) => setIdNumber(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white font-mono placeholder-slate-600 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                    </div>

                    {/* ✅ 3. CONSENTEMENT */}
                    <div className="mb-8 flex items-start gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700 transition hover:border-amber-500/30">
                        <input 
                            type="checkbox" 
                            id="kyc-consent"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500/50 cursor-pointer" 
                        />
                        <label htmlFor="kyc-consent" className="text-xs text-slate-400 cursor-pointer select-none leading-relaxed">
                            Je déclare que les fonds investis ont une origine légale. 
                            J'accepte le traitement de mes données pour la lutte contre le blanchiment (LCB-FT).
                        </label>
                    </div>

                    {/* ✅ 4. NOUVEAU COMPOSANT D'UPLOAD S3 (Privé) */}
                    <div className="mb-8">
                         <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-1 tracking-widest">
                            Scan du document (Recto/Verso) <span className="text-amber-500">*</span>
                        </label>
                        <SecureDocumentUpload 
                            label={idType === "PASSPORT" ? "Page photo du Passeport" : "Carte Nationale d'Identité"}
                            onUploadComplete={(key) => {
                                setDocumentKey(key);
                                console.log("Document secured on S3:", key);
                            }}
                            maxSizeMb={5}
                        />
                    </div>

                    {/* BOUTON FINAL */}
                    <button 
                        onClick={handleFinalSubmit}
                        disabled={submitting || !consent || !documentKey || idNumber.length < 5}
                        className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2
                            ${submitting || !consent || !documentKey || idNumber.length < 5
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                : "bg-amber-600 text-white hover:bg-amber-500 shadow-amber-900/20 active:scale-95"
                            }
                        `}
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <ShieldCheck className="w-4 h-4" />}
                        {submitting ? "Transmission sécurisée..." : "Soumettre mon dossier"}
                    </button>

                </div>
            )}

            {/* INFO LÉGALE */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-10">
                <div>
                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-amber-500"/> Lutte Anti-Blanchiment
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Conformément à la directive UEMOA, nous devons identifier l'origine des fonds et le bénéficiaire effectif de chaque investissement.
                    </p>
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-amber-500"/> Plafonds Débloqués
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Le statut "Vérifié" supprime la limite de dépôt de 2.000.000 FCFA/mois et autorise les virements bancaires internationaux.
                    </p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
