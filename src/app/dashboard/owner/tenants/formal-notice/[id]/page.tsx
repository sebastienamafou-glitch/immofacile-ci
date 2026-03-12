"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, ArrowLeft, Printer, ShieldAlert, MailWarning } from "lucide-react";
import { toast } from "sonner";

// ✅ DTO STRICT : Définit exactement ce dont le PDF a besoin
interface FormalNoticeData {
    id: string;
    startDate: string | Date;
    monthlyRent: number;
    property: {
        title: string;
        address: string;
        commune: string;
    };
    tenant: {
        name: string;
    };
    // Les infos du propriétaire ne sont pas toujours renvoyées par l'API de base du bail.
    // Nous les rendons optionnelles pour éviter les crashs.
    ownerInfo?: {
        name?: string;
        address?: string;
        phone?: string;
    };
}

export default function FormalNoticePage() {
  const params = useParams();
  const router = useRouter();
  
  // ✅ SÉCURITÉ : Extraction sécurisée de l'ID (fallback sur id ou leaseId selon le nom de votre dossier)
  const id = (params?.id || params?.leaseId) as string | undefined;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FormalNoticeData | null>(null);

  useEffect(() => {
    if (!id) return; // Stoppe l'exécution si l'ID n'est pas prêt

    const fetchLeaseData = async () => {
      try {
        const res = await api.get(`/owner/leases/${id}`);
        if (res.data.success) {
            // Mapping de sécurité si l'API ne renvoie pas la structure exacte attendue
            const lease = res.data.lease;
            setData({
                id: lease.id,
                startDate: lease.startDate,
                monthlyRent: lease.monthlyRent,
                property: {
                    title: lease.property?.title || "Adresse Inconnue",
                    address: lease.property?.address || "",
                    commune: lease.property?.commune || "",
                },
                tenant: {
                    name: lease.tenant?.name || "Locataire Inconnu"
                },
                ownerInfo: {
                    // Si l'API renvoie property.owner, on l'utilise, sinon on laisse vide
                    name: lease.property?.owner?.name || "Le Propriétaire",
                    address: lease.property?.owner?.address || "Adresse non renseignée",
                    phone: lease.property?.owner?.phone || "Non renseigné"
                }
            });
        } else {
            throw new Error(res.data.error || "Bail introuvable");
        }
      } catch (e: any) { 
        console.error(e); 
        toast.error("Impossible de générer le document. Données incomplètes.");
        router.push('/dashboard/owner/tenants');
      } finally { 
        setLoading(false); 
      }
    };
    
    fetchLeaseData();
  }, [id, router]);

  if (loading || !data) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="animate-spin w-10 h-10 text-red-500"/> 
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Rédaction de l'acte juridique...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1120] py-10 print:bg-white print:py-0">
      
      {/* Barre d'outils (Invisible à l'impression) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center px-4 print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white font-bold transition">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl transition shadow-lg shadow-red-600/20">
          <Printer className="w-4 h-4" /> GÉNÉRER LE PDF OFFICIEL
        </button>
      </div>

      {/* Rendu du Courrier (Format A4) */}
      <div className="max-w-[210mm] mx-auto bg-white text-black p-[25mm] shadow-2xl min-h-[297mm] relative print:shadow-none print:m-0 overflow-hidden">
        
        {/* FILIGRANE DISCRET (Optionnel) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none -rotate-45">
            <ShieldAlert size={600} />
        </div>

        {/* --- 1. EN-TÊTE --- */}
        <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-12">
          <div className="space-y-1">
            <h2 className="font-black text-xl uppercase tracking-tighter">Babimmo</h2>
            <div className="text-[12px] text-slate-600 leading-tight">
                {/* Sécurisation de l'affichage avec l'opérateur optionnel */}
                <p className="font-bold text-black uppercase">{data.ownerInfo?.name}</p>
                <p>{data.ownerInfo?.address}</p>
                <p>Tél : {data.ownerInfo?.phone}</p>
            </div>
          </div>
          
          {/* Badge de statut juridique */}
          <div className="border-2 border-red-600 p-2 text-red-600 flex flex-col items-center gap-1 rounded-sm rotate-3">
             <ShieldAlert size={20} />
             <span className="text-[10px] font-black uppercase tracking-tighter">Acte Contentieux</span>
          </div>
        </div>

        {/* --- 2. DESTINATAIRE --- */}
        <div className="flex justify-end mb-16">
          <div className="w-1/2 text-sm bg-slate-50 p-6 border-l-4 border-black">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Destinataire :</p>
            <p className="font-black text-lg uppercase">{data.tenant.name}</p>
            <p className="mt-1 font-bold">{data.property.title}</p>
            <p className="italic text-slate-600">{data.property.address}, {data.property.commune}</p>
          </div>
        </div>

        {/* --- 3. OBJET & DATE --- */}
        <div className="mb-10 flex justify-between items-end">
            <div className="space-y-1">
                <p className="text-sm font-bold underline">Objet : MISE EN DEMEURE POUR IMPAYÉS DE LOYER</p>
                <p className="text-[11px] font-bold text-red-600 uppercase flex items-center gap-2">
                   <MailWarning size={14} /> Lettre recommandée avec accusé de réception
                </p>
            </div>
            <p className="text-sm italic">Fait à Abidjan, le {new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        {/* --- 4. CORPS DU TEXTE --- */}
        <div className="space-y-6 text-sm text-justify leading-relaxed">
          <p>M./Mme <strong>{data.tenant.name}</strong>,</p>
          
          <p>
            En votre qualité de locataire du logement situé au <strong>{data.property.title}</strong>, et en vertu du contrat de bail signé le {new Date(data.startDate).toLocaleDateString('fr-FR')}, il a été constaté à ce jour un défaut de paiement de vos obligations locatives.
          </p>

          <p>Malgré nos précédentes relances restées infructueuses, nous constatons que la somme suivante n'a toujours pas été régularisée :</p>

          {/* TABLEAU RÉCAPITULATIF DES DETTES */}
          <div className="bg-white border-2 border-black overflow-hidden my-6">
            <div className="bg-black text-white px-4 py-2 font-bold text-xs uppercase flex justify-between">
                <span>Désignation</span>
                <span>Montant (FCFA)</span>
            </div>
            <div className="p-4 flex justify-between items-center border-b border-slate-100">
                <span className="font-medium">Loyer mensuel courant</span>
                <span className="font-black text-lg">{data.monthlyRent.toLocaleString()} FCFA</span>
            </div>
            <div className="p-4 bg-slate-50 flex justify-between items-center">
                <span className="font-black text-sm uppercase">Total de la dette exigible</span>
                <span className="font-black text-xl text-red-600">{data.monthlyRent.toLocaleString()} FCFA</span>
            </div>
          </div>

          <div className="font-black border-2 border-red-600 p-4 rounded-sm text-red-600 bg-red-50/50">
            PAR LA PRÉSENTE, NOUS VOUS METTONS EN DEMEURE DE RÉGLER LA SOMME TOTALE DE {data.monthlyRent.toLocaleString()} FCFA DANS UN DÉLAI DE 48 HEURES.
          </div>

          <p>
            À défaut de réception du paiement intégral dans ce délai, nous serons au regret d'engager sans préavis une <strong>procédure de résiliation de bail et d'expulsion</strong> auprès de la juridiction compétente, conformément aux dispositions de la Loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat.
          </p>

          <p>Nous vous rappelons que les frais de procédure qui en découleraient seront intégralement à votre charge.</p>

          <p className="pt-4">Veuillez agréer, M./Mme {data.tenant.name}, l'expression de nos salutations distinguées.</p>
        </div>

        {/* --- 5. SIGNATURES --- */}
        <div className="mt-20 flex justify-between items-start">
            <div className="text-[10px] text-slate-400">
                Document généré par la plateforme Babimmo<br/>
                ID Réf : {data.id.substring(0, 12)}<br/>
                Horodatage : {new Date().toLocaleTimeString()}
            </div>
            <div className="flex flex-col items-center gap-16">
                <p className="font-bold text-xs uppercase underline">Le Bailleur / Mandataire</p>
                {/* Emplacement cachet fictif */}
                <div className="w-32 h-32 border-2 border-blue-700/20 rounded-full flex items-center justify-center text-blue-700/20 -rotate-12 font-black text-[10px] uppercase border-dashed">
                    Cachet Babimmo
                </div>
            </div>
        </div>

        {/* FOOTER BAS DE PAGE (Print uniquement) */}
        <div className="absolute bottom-8 left-0 w-full text-center text-[9px] text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-4 hidden print:block">
            Babimmo - Solution de Gestion Immobilière Connectée - www.babimmo.ci
        </div>
      </div>
    </div>
  );
}
