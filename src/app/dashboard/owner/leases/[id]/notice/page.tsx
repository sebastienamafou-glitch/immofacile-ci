"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation"; // ✅ Hook useParams
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Loader2, AlertTriangle, Stamp } from "lucide-react";
import { toast } from "sonner";

export default function FormalNoticePage() {
  const params = useParams();
  const id = params?.id as string;
  
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
        if (!id) return;
        try {
            // ✅ APPEL ZÉRO TRUST
            const res = await api.get(`/owner/leases/${id}/notice`);
            
            if(res.data.success) {
                setData(res.data.data);
            } else {
                throw new Error(res.data.error);
            }
        } catch (e: any) { 
            console.error(e);
            toast.error(e.response?.data?.error || "Impossible de générer le document.");
            // Si pas de dette, on redirige peut-être ? (Optionnel)
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-black"/></div>;
  if (!data) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-bold text-gray-900">Document indisponible</h2>
          <p className="text-gray-500">Ce bail ne présente peut-être aucun impayé ou n'existe pas.</p>
          <Button onClick={() => router.back()}>Retour</Button>
      </div>
  );

  const { lease, debtAmount, unpaidMonths, ownerName } = data;

  return (
    <div className="min-h-screen bg-gray-100 py-10 print:p-0 print:bg-white font-serif text-black overflow-auto">
      
      {/* HEADER NO-PRINT : Commandes */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden px-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-600 hover:bg-white hover:text-black">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour au Bail
        </Button>
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold border border-red-200 flex items-center gap-2">
            <Stamp className="w-4 h-4" /> Mode Prévisualisation Juridique
        </div>
        <Button onClick={() => window.print()} className="bg-red-700 hover:bg-red-800 text-white shadow-lg shadow-red-900/20 font-sans font-bold">
            <Printer className="w-4 h-4 mr-2" /> Imprimer / PDF
        </Button>
      </div>

      {/* FEUILLE A4 (Format Papier Strict) */}
      <div className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-[25mm] relative print:shadow-none print:w-full print:m-0 print:p-[20mm]">
        
        {/* EN-TÊTE HUISSIER (Simulé) */}
        <div className="text-center border-b-4 double border-black pb-6 mb-10">
            <h1 className="text-2xl font-bold uppercase tracking-wide font-sans text-black">ÉTUDE DE COMMISSAIRE DE JUSTICE</h1>
            <p className="italic text-lg text-gray-600 font-serif">Près le Tribunal de Première Instance d'Abidjan</p>
            <p className="text-sm mt-2 text-gray-500 font-sans">Cocody, II Plateaux, Rue des Jardins - Tél : 27 22 44 XX XX</p>
        </div>

        {/* OBJET URGENT */}
        <div className="border-4 border-black p-4 text-center bg-gray-50 mb-12 print:bg-transparent">
            <p className="font-bold text-xl uppercase tracking-wider font-sans text-black">OBJET : MISE EN DEMEURE DE PAYER</p>
            <p className="text-sm font-bold mt-1 text-red-700 print:text-black">AVANT PROCÉDURE D'EXPULSION</p>
        </div>

        {/* DESTINATAIRE */}
        <div className="mb-12 text-lg ml-auto w-2/3 border-l-4 border-gray-200 pl-6 print:border-black">
            <p className="mb-1 text-black"><strong>À l'attention de :</strong></p>
            <p className="text-xl uppercase mb-4 font-bold text-black">{lease.tenant.name}</p>
            
            <p className="mb-1 text-black"><strong>Concernant le logement sis à :</strong></p>
            <p className="text-gray-800">{lease.property.address}</p>
            <p className="text-gray-800">{lease.property.commune}, Abidjan</p>
            
            <p className="mt-4 text-sm text-gray-500 italic">
                Fait à Abidjan, le {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </div>

        {/* CORPS DU TEXTE */}
        <div className="text-justify text-[11pt] leading-relaxed space-y-6 font-sans text-gray-900">
            <p>Monsieur, Madame,</p>

            <p>
                Agissant pour le compte de votre Propriétaire, <strong>{ownerName}</strong>, 
                via la plateforme de gestion agréée <strong>ImmoFacile CI</strong>.
            </p>

            <p>
                Sauf erreur ou omission de notre part, nous constatons qu'à ce jour, en dépit de nos relances amiables, vous restez redevable de la somme de :
            </p>

            <div className="text-center my-8">
                <span className="text-4xl font-black border-b-2 border-red-600 pb-2 text-black print:border-black">
                    {debtAmount.toLocaleString('fr-FR')} FCFA
                </span>
            </div>

            <p>Cette somme correspond aux loyers impayés sur la période suivante : <strong>{unpaidMonths}</strong>.</p>

            <p>
                En vertu de la <strong>loi n°2019-576</strong> relative au bail à usage d'habitation en Côte d'Ivoire, 
                nous vous mettons en demeure de régler ladite somme sous un délai impératif de <strong>48 heures</strong>.
            </p>

            <div className="bg-gray-100 p-4 border-l-4 border-red-600 text-sm font-medium print:bg-transparent print:border-black">
                À défaut de paiement intégral dans ce délai, nous avons pour instruction irrévocable d'engager :
                <ol className="list-decimal pl-5 mt-2 space-y-1 font-bold">
                    <li>La résiliation de plein droit de votre bail ;</li>
                    <li>Une procédure d'expulsion forcée par voie de justice ;</li>
                    <li>La saisie conservatoire de vos comptes bancaires et biens mobiliers.</li>
                </ol>
            </div>

            <p className="font-bold text-center mt-8 uppercase text-sm tracking-widest text-black">
                VEUILLEZ CONSIDÉRER LA PRÉSENTE COMME DERNIÈRE SOMMATION AVANT POURSUITES.
            </p>
        </div>

        {/* SIGNATURE */}
        <div className="mt-16 flex justify-end">
            <div className="text-center">
                <p className="mb-4 text-sm font-bold text-black">Pour le Commissaire de Justice</p>
                {/* Tampon Numérique */}
                <div className="relative inline-block border-[3px] border-blue-900 text-blue-900 p-4 font-bold uppercase -rotate-2 text-xs w-48 bg-blue-50/50 print:border-black print:text-black print:bg-transparent">
                    <div className="absolute inset-0 border border-blue-900/20 m-1 print:border-black/20"></div>
                    ACTE SIGNIFIÉ<br/>
                    PAR VOIE ÉLECTRONIQUE<br/>
                    CERTIFIÉ IMMOFACILE<br/>
                    {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>

        {/* FOOTER TECH */}
        <div className="absolute bottom-8 left-0 w-full text-center text-[7pt] text-gray-400 print:text-black">
            Document généré automatiquement via API ImmoFacile - Réf Dossier: {id.split('-')[0].toUpperCase()}
        </div>

      </div>
    </div>
  );
}
