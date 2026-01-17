"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, CheckCircle2, PenTool, Download, ShieldCheck, AlertCircle } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { useRouter } from "next/navigation"; // Correction import

// Typage Next.js 14 standard
export default function ContractPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState<any>(null);
  const [signing, setSigning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewerRole, setViewerRole] = useState<'OWNER' | 'TENANT'>('TENANT');

  useEffect(() => {
    // 1. Détection du rôle via le stockage local
    const stored = localStorage.getItem("immouser");
    if (stored) {
        const user = JSON.parse(stored);
        if (user.role === 'OWNER') setViewerRole('OWNER');
    } else {
        // Sécurité : si pas connecté, renvoyer au login
        router.push('/login');
        return;
    }

    // 2. Chargement des données
    const fetchContract = async () => {
        try {
            // On utilise l'endpoint public ou spécifique selon votre API
            // Ici on suppose une route unifiée ou on tente celle du tenant/owner
            const res = await api.get(`/contract/${id}`); 
            if (res.data.success) {
                setLease(res.data.lease);
            } else {
                toast.error("Contrat introuvable.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erreur chargement contrat.");
        } finally {
            setLoading(false);
        }
    };
    fetchContract();
  }, [id, router]);

  // --- LOGIQUE DE SIGNATURE (Intelligente selon le rôle) ---
  const handleSign = async () => {
    if (!lease) return;

    // A. SCÉNARIO PROPRIÉTAIRE
    if (viewerRole === 'OWNER') {
        const confirm = await Swal.fire({
            title: 'Valider le dossier ?',
            text: "En contresignant, vous validez ce bail. Le locataire deviendra actif.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Oui, je valide',
            confirmButtonColor: '#059669',
            cancelButtonColor: '#334155',
            background: '#0f172a', color: '#fff'
        });

        if (confirm.isConfirmed) {
            setSigning(true);
            try {
                // Appel API spécifique Owner
                const res = await api.post('/owner/contract/sign', { leaseId: lease.id });
                if (res.data.success) {
                    Swal.fire('Validé !', 'Le contrat est actif.', 'success');
                    setLease({ ...lease, signatureStatus: 'COMPLETED', updatedAt: new Date().toISOString() });
                }
            } catch (e) {
                toast.error("Erreur validation.");
            } finally { setSigning(false); }
        }
        return;
    }

    // B. SCÉNARIO LOCATAIRE
    const confirm = await Swal.fire({
        title: 'Signer le bail ?',
        text: "Cette action vaut engagement légal.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Je signe',
        confirmButtonColor: '#ea580c',
        background: '#0f172a', color: '#fff'
    });

    if (confirm.isConfirmed) {
        setSigning(true);
        try {
            const res = await api.post('/tenant/contract/sign', { leaseId: lease.id });
            if (res.data.success) {
                Swal.fire('Signé !', 'En attente de validation propriétaire.', 'success');
                setLease({ ...lease, signatureStatus: 'SIGNED_TENANT', updatedAt: new Date().toISOString() });
            }
        } catch (e) {
            toast.error("Erreur signature.");
        } finally { setSigning(false); }
    }
  };

  // --- GÉNÉRATION PDF CORRIGÉE ---
  const handleDownload = async () => {
    if(!lease) return;
    setDownloading(true);

    try {
        const html2pdf = (await import('html2pdf.js')).default;
        const element = document.getElementById('printable-contract');
        
        // ✅ CORRECTION ICI : On vérifie que l'élément existe vraiment
        if (!element) {
            toast.error("Erreur : Le document n'est pas visible.");
            setDownloading(false);
            return;
        }
        
        const opt: any = {
          margin: [15, 15, 15, 15], 
          filename: `Bail_${lease.id.substring(0,8)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // TypeScript est rassuré, car on a vérifié "if (!element)" juste avant
        await html2pdf().set(opt).from(element).save();
        toast.success("Téléchargement lancé !");

    } catch (error) {
        console.error(error);
        toast.error("Erreur lors de la génération du PDF.");
    } finally {
        setDownloading(false);
    }
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>;
  if (!lease) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">Contrat introuvable.</div>;

  // Calcul des états
  const isTenantSigned = ['SIGNED_TENANT', 'COMPLETED'].includes(lease.signatureStatus);
  const isFullySigned = lease.signatureStatus === 'COMPLETED';
  
  // Est-ce que JE dois signer maintenant ?
  const needsMySignature = 
      (viewerRole === 'TENANT' && lease.signatureStatus === 'PENDING') ||
      (viewerRole === 'OWNER' && lease.signatureStatus === 'SIGNED_TENANT');

  // Est-ce que J'AI déjà signé (ou tout est fini) ?
  const iHaveSigned = 
      (viewerRole === 'TENANT' && isTenantSigned) ||
      (viewerRole === 'OWNER' && isFullySigned);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 py-10 px-4 font-sans flex justify-center">
      <div className="max-w-[210mm] w-full space-y-6">
        
        {/* HEADER ET ACTIONS */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/80 backdrop-blur p-6 rounded-2xl border border-slate-800 shadow-xl sticky top-4 z-50">
            <div>
                <h1 className="text-xl font-black text-white flex items-center gap-3">
                    <ShieldCheck className={isFullySigned ? "text-emerald-500" : "text-orange-500"} /> 
                    {isFullySigned ? "CONTRAT ACTIF" : "SIGNATURE REQUISE"}
                </h1>
                <p className="text-slate-400 text-xs mt-1 font-mono uppercase">Role: {viewerRole === 'OWNER' ? 'Propriétaire' : 'Locataire'}</p>
            </div>
            
            <div className="mt-4 md:mt-0 flex gap-3">
                 {/* BOUTON SIGNER (Si nécessaire) */}
                 {needsMySignature && (
                     <button 
                        onClick={handleSign}
                        disabled={signing}
                        className={`${viewerRole === 'OWNER' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-orange-600 hover:bg-orange-500'} text-white px-6 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 animate-pulse`}
                     >
                        {signing ? <Loader2 className="animate-spin w-4 h-4"/> : <PenTool className="w-4 h-4"/>}
                        {viewerRole === 'OWNER' ? 'Contresigner le bail' : 'Signer maintenant'}
                     </button>
                 )}

                 {/* BOUTON TELECHARGER (Toujours là si signé par qqn) */}
                 {(isTenantSigned || isFullySigned) && (
                     <button 
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm font-bold transition"
                     >
                        {downloading ? <Loader2 className="animate-spin w-4 h-4"/> : <Download className="w-4 h-4"/>}
                        PDF
                     </button>
                 )}
            </div>
        </div>

        {/* --- DOCUMENT OFFICIEL (Le Papier Blanc) --- */}
        <div id="printable-contract" className="bg-white text-[#1f2937] p-[15mm] shadow-2xl rounded-sm min-h-[297mm]">
            
            {/* EN-TÊTE LEGAL */}
            <div className="text-center border-b-2 border-black pb-4 mb-8">
                <h1 className="text-2xl font-serif font-bold tracking-tight mb-2 text-black uppercase">CONTRAT DE BAIL D'HABITATION</h1>
                <p className="text-slate-600 italic font-serif text-[11px]">Soumis à la Loi n° 2019-576 du 26 juin 2019</p>
            </div>

            {/* PARTIES */}
            <div className="grid grid-cols-2 gap-6 mb-8 text-[11px] font-serif">
                <div className="bg-slate-50 p-4 border border-slate-200">
                    <p className="font-bold text-[9px] uppercase tracking-widest text-slate-500 mb-2">LE BAILLEUR</p>
                    <p className="font-bold text-sm text-black uppercase">{lease.property.owner.name}</p>
                    <p>Email : {lease.property.owner.email}</p>
                </div>
                <div className="bg-slate-50 p-4 border border-slate-200">
                    <p className="font-bold text-[9px] uppercase tracking-widest text-slate-500 mb-2">LE PRENEUR</p>
                    <p className="font-bold text-sm text-black uppercase">{lease.tenant.name}</p>
                    <p>Email : {lease.tenant.email}</p>
                </div>
            </div>

            {/* ARTICLES DE LOI */}
            <div className="space-y-6 text-justify font-serif text-[11px] leading-relaxed">
                <p className="font-bold text-center mb-4">IL A ÉTÉ CONVENU CE QUI SUIT :</p>

                <section>
                    <h3 className="font-bold text-black underline mb-1">ARTICLE 1 : OBJET DU CONTRAT</h3>
                    <p>
                        Le Bailleur donne en location au Preneur les locaux situés à : <strong>{lease.property.address}, {lease.property.commune}</strong>. 
                        Désignation du bien : <strong>{lease.property.title}</strong>.
                    </p>
                </section>

                <section>
                    <h3 className="font-bold text-black underline mb-1">ARTICLE 2 : DURÉE</h3>
                    <p>
                        Le bail est consenti pour <strong>un (1) an</strong> renouvelable par tacite reconduction, 
                        prenant effet le <strong>{new Date(lease.startDate).toLocaleDateString('fr-FR', {dateStyle: 'long'})}</strong>.
                    </p>
                </section>

                <section>
                    <h3 className="font-bold text-black underline mb-1">ARTICLE 3 : LOYER ET CHARGES</h3>
                    <p>
                        Le loyer mensuel est de <strong>{lease.monthlyRent.toLocaleString()} FCFA</strong> payable d'avance.
                        Un dépôt de garantie de <strong>{lease.depositAmount.toLocaleString()} FCFA</strong> a été versé.
                    </p>
                </section>

                <section>
                    <h3 className="font-bold text-black underline mb-1">ARTICLE 4 : OBLIGATIONS</h3>
                    <p>Le Preneur s'engage à payer le loyer à échéance et à user paisiblement des lieux.</p>
                </section>
            </div>

            {/* SIGNATURES VISUELLES */}
            <div className="mt-12 pt-6 border-t-2 border-black">
                <p className="mb-6 text-[10px] text-center">
                    Fait à Abidjan, le {new Date().toLocaleDateString('fr-FR', {dateStyle: 'long'})}.
                </p>
                
                <div className="flex justify-between gap-8">
                    {/* ZONE BAILLEUR */}
                    <div className="w-1/2">
                        <p className="font-bold uppercase text-[9px] mb-2 text-slate-600">POUR LE BAILLEUR</p>
                        {isFullySigned ? (
                            <div className="h-24 border-2 border-emerald-600 bg-emerald-50/50 flex flex-col items-center justify-center text-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1" />
                                <p className="text-emerald-800 font-bold text-[9px]">SIGNÉ NUMÉRIQUEMENT</p>
                                <p className="text-emerald-600 text-[8px]">{new Date(lease.updatedAt).toLocaleDateString()}</p>
                            </div>
                        ) : (
                            <div className="h-24 border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                                <p className="text-[9px] text-slate-400 italic">En attente...</p>
                            </div>
                        )}
                    </div>

                    {/* ZONE PRENEUR */}
                    <div className="w-1/2">
                        <p className="font-bold uppercase text-[9px] mb-2 text-slate-600">POUR LE PRENEUR</p>
                        {isTenantSigned ? (
                            <div className="h-24 border-2 border-emerald-600 bg-emerald-50/50 flex flex-col items-center justify-center text-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1" />
                                <p className="text-emerald-800 font-bold text-[9px]">SIGNÉ NUMÉRIQUEMENT</p>
                                <p className="text-emerald-700 text-[8px] font-bold">{lease.tenant.name}</p>
                            </div>
                        ) : (
                            <div className="h-24 border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                                <p className="text-[9px] text-slate-400 italic">En attente...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-10 text-center border-t border-slate-200 pt-2">
                <p className="text-[8px] text-slate-400">ID Unique : {lease.id}</p>
            </div>
        </div>

      </div>
    </div>
  );
}
