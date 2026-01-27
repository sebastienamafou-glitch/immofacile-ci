"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, CheckCircle2, PenTool, Download, ShieldCheck, AlertCircle, FileText } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Typage strict des props
interface PageProps {
  params: { id: string }
}

export default function ContractPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState<any>(null);
  const [signing, setSigning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewerRole, setViewerRole] = useState<'OWNER' | 'TENANT'>('TENANT');

  useEffect(() => {
    // 1. Détection du rôle
    const stored = localStorage.getItem("immouser");
    if (stored) {
        const user = JSON.parse(stored);
        if (user.role === 'OWNER') setViewerRole('OWNER');
    } else {
        router.push('/login');
        return;
    }

    // 2. Chargement des données du bail
    const fetchContract = async () => {
        try {
            // On récupère les métadonnées (JSON) pour l'affichage écran
            const res = await api.get(`/owner/contract/${id}`); 
            // Note: Assurez-vous que cette route renvoie bien le JSON du bail. 
            // Si votre route renvoie le PDF par défaut, il faudra séparer :
            // GET /api/leases/[id] -> JSON
            // GET /api/owner/contract/[id] -> PDF
            // Ici, je suppose que vous avez une route pour lire les données du bail :
            const leaseData = await api.get(`/leases/${id}`); // Route standard de lecture

            if (leaseData.data.success) {
                setLease(leaseData.data.lease);
            } else {
                toast.error("Contrat introuvable.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erreur chargement des données.");
        } finally {
            setLoading(false);
        }
    };
    fetchContract();
  }, [id, router]);

  // --- LOGIQUE DE SIGNATURE ---
  const handleSign = async () => {
    if (!lease) return;

    // A. SCÉNARIO PROPRIÉTAIRE
    if (viewerRole === 'OWNER') {
        const confirm = await Swal.fire({
            title: 'Valider le dossier ?',
            text: "En contresignant, vous validez ce bail de manière irrévocable.",
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
                const res = await api.post('/owner/contract/sign', { leaseId: lease.id });
                if (res.data.success) {
                    Swal.fire('Validé !', 'Le contrat est actif.', 'success');
                    // Mise à jour locale optimiste
                    setLease({ ...lease, signatureStatus: 'COMPLETED', updatedAt: new Date().toISOString() });
                }
            } catch (e) {
                toast.error("Erreur lors de la validation.");
            } finally { setSigning(false); }
        }
        return;
    }

    // B. SCÉNARIO LOCATAIRE
    const confirm = await Swal.fire({
        title: 'Signer le bail ?',
        text: "Cette action vaut engagement légal et génère une preuve numérique.",
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
                Swal.fire('Signé !', 'En attente de la validation du propriétaire.', 'success');
                setLease({ ...lease, signatureStatus: 'SIGNED_TENANT', updatedAt: new Date().toISOString() });
            }
        } catch (e) {
            toast.error("Erreur lors de la signature.");
        } finally { setSigning(false); }
    }
  };

  // --- TÉLÉCHARGEMENT OFFICIEL (BACKEND PDFKIT) ---
  const handleDownload = async () => {
    if(!lease) return;
    setDownloading(true);

    try {
        // ✅ CORRECTION CRITIQUE : Appel de la route API qui génère le vrai PDF
        const response = await api.get(`/owner/contract/${lease.id}`, {
            responseType: 'blob', // Important : on attend un fichier binaire
        });

        // Création d'un lien invisible pour déclencher le téléchargement
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Bail_Certifie_${lease.id.substring(0,8)}.pdf`);
        document.body.appendChild(link);
        link.click();
        
        // Nettoyage
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success("Document officiel téléchargé !");

    } catch (error) {
        console.error(error);
        toast.error("Impossible de générer le PDF certifié.");
    } finally {
        setDownloading(false);
    }
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div>;
  if (!lease) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">Contrat introuvable.</div>;

  // États calculés
  const isFullySigned = lease.signatureStatus === 'COMPLETED';
  const isTenantSigned = ['SIGNED_TENANT', 'COMPLETED'].includes(lease.signatureStatus);
  
  const needsMySignature = 
      (viewerRole === 'TENANT' && lease.signatureStatus === 'PENDING') ||
      (viewerRole === 'OWNER' && lease.signatureStatus === 'SIGNED_TENANT');

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 py-10 px-4 font-sans flex justify-center">
      <div className="max-w-[210mm] w-full space-y-6">
        
        {/* HEADER FLOTTANT */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/90 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-2xl sticky top-4 z-50">
            <div>
                <h1 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                    <ShieldCheck className={isFullySigned ? "text-emerald-500" : "text-orange-500"} /> 
                    {isFullySigned ? "Contrat Actif & Certifié" : "Signature Requise"}
                </h1>
                <p className="text-slate-400 text-xs mt-1 font-mono uppercase">
                    Vue : {viewerRole === 'OWNER' ? 'Propriétaire' : 'Locataire'} • Ref: {lease.id.substring(0,8)}
                </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex gap-3">
                 {/* ACTION SIGNATURE */}
                 {needsMySignature && (
                     <button 
                        onClick={handleSign}
                        disabled={signing}
                        className={`${viewerRole === 'OWNER' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-orange-600 hover:bg-orange-500'} text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 animate-pulse active:scale-95 transition-all`}
                     >
                        {signing ? <Loader2 className="animate-spin w-4 h-4"/> : <PenTool className="w-4 h-4"/>}
                        {viewerRole === 'OWNER' ? 'VALIDER & CONTRESIGNER' : 'SIGNER LE BAIL'}
                     </button>
                 )}

                 {/* ACTION PDF OFFICIEL */}
                 <button 
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm font-bold transition text-white"
                 >
                    {downloading ? <Loader2 className="animate-spin w-4 h-4"/> : <Download className="w-4 h-4"/>}
                    {isFullySigned ? "TÉLÉCHARGER L'ORIGINAL" : "APERÇU PDF"}
                 </button>
            </div>
        </div>

        {/* --- APERÇU HTML (Pour lecture écran uniquement) --- */}
        {/* Note : Ce visuel sert à rassurer l'utilisateur avant qu'il ne télécharge le vrai PDF */}
        <div className="bg-white text-[#1f2937] p-[15mm] shadow-2xl rounded-sm min-h-[297mm] select-none opacity-90 hover:opacity-100 transition-opacity">
            
            <div className="flex justify-end mb-10">
                <div className="text-right">
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">Document Provisoire</p>
                    <p className="text-[9px] text-slate-400">Visualisation web</p>
                </div>
            </div>

            <div className="text-center border-b-2 border-black pb-6 mb-10">
                <h1 className="text-3xl font-serif font-bold tracking-tight mb-2 text-black uppercase">CONTRAT DE BAIL D'HABITATION</h1>
                <p className="text-slate-600 italic font-serif text-xs">Soumis à la Loi n° 2019-576 du 26 juin 2019 (Côte d'Ivoire)</p>
            </div>

            {/* BLOC PARTIES */}
            <div className="grid grid-cols-2 gap-8 mb-10 text-xs font-serif">
                <div className="bg-slate-50 p-6 border border-slate-200">
                    <p className="font-bold text-[10px] uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-200 pb-1">LE BAILLEUR (Propriétaire)</p>
                    <p className="font-bold text-base text-black uppercase">{lease.property.owner.name}</p>
                    <p className="mt-1">Email : {lease.property.owner.email}</p>
                    {lease.property.owner.phone && <p>Tél : {lease.property.owner.phone}</p>}
                </div>
                <div className="bg-slate-50 p-6 border border-slate-200">
                    <p className="font-bold text-[10px] uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-200 pb-1">LE PRENEUR (Locataire)</p>
                    <p className="font-bold text-base text-black uppercase">{lease.tenant.name}</p>
                    <p className="mt-1">Email : {lease.tenant.email}</p>
                    {lease.tenant.phone && <p>Tél : {lease.tenant.phone}</p>}
                </div>
            </div>

            {/* ARTICLES */}
            <div className="space-y-8 text-justify font-serif text-xs leading-relaxed px-4">
                <section>
                    <h3 className="font-bold text-black underline mb-2">ARTICLE 1 : DÉSIGNATION DES LIEUX</h3>
                    <p>
                        Le Bailleur donne en location les locaux situés à : <strong>{lease.property.address}, {lease.property.commune}</strong>.<br/>
                        Type de bien : <strong>{lease.property.title}</strong>.
                    </p>
                </section>

                <section>
                    <h3 className="font-bold text-black underline mb-2">ARTICLE 2 : DURÉE ET PRISE D'EFFET</h3>
                    <p>
                        Le présent bail est conclu pour une durée de <strong>un (1) an</strong> renouvelable par tacite reconduction.<br/>
                        Il prend effet à compter du : <strong>{new Date(lease.startDate).toLocaleDateString('fr-FR', {dateStyle: 'full'})}</strong>.
                    </p>
                </section>

                <section>
                    <h3 className="font-bold text-black underline mb-2">ARTICLE 3 : CONDITIONS FINANCIÈRES</h3>
                    <ul className="list-disc ml-5 space-y-1">
                        <li>Loyer Mensuel : <strong>{lease.monthlyRent.toLocaleString()} FCFA</strong>.</li>
                        <li>Dépôt de Garantie : <strong>{lease.depositAmount.toLocaleString()} FCFA</strong> (restituable en fin de bail).</li>
                    </ul>
                </section>
            </div>

            {/* BAS DE PAGE (SIGNATURES) */}
            <div className="mt-20 pt-8 border-t-2 border-black">
                <div className="flex justify-between gap-10">
                    <div className="w-1/2 text-center">
                        <p className="font-bold uppercase text-[10px] mb-4 text-slate-600">SIGNATURE DU BAILLEUR</p>
                        {isFullySigned ? (
                            <div className="h-24 border-2 border-emerald-600 bg-emerald-50 flex flex-col items-center justify-center rounded-lg">
                                <ShieldCheck className="w-6 h-6 text-emerald-600 mb-1" />
                                <span className="text-emerald-800 font-bold text-[10px]">VALIDÉ</span>
                            </div>
                        ) : (
                            <div className="h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-[10px] italic">En attente...</div>
                        )}
                    </div>
                    <div className="w-1/2 text-center">
                        <p className="font-bold uppercase text-[10px] mb-4 text-slate-600">SIGNATURE DU PRENEUR</p>
                        {isTenantSigned ? (
                            <div className="h-24 border-2 border-emerald-600 bg-emerald-50 flex flex-col items-center justify-center rounded-lg">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 mb-1" />
                                <span className="text-emerald-800 font-bold text-[10px]">SIGNÉ ÉLECTRONIQUEMENT</span>
                                <span className="text-[8px] text-emerald-600 mt-1">{new Date(lease.updatedAt).toLocaleString()}</span>
                            </div>
                        ) : (
                            <div className="h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-[10px] italic">En attente...</div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="mt-12 text-center">
                 <p className="text-[9px] text-slate-400 flex items-center justify-center gap-1">
                    <FileText className="w-3 h-3"/> Document sécurisé par la plateforme ImmoFacile
                 </p>
            </div>
        </div>

      </div>
    </div>
  );
}
