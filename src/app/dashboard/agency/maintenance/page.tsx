"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { Loader2, AlertCircle, CheckCircle2, Wrench, User, Hammer, ChevronRight, X, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Incident, Property, User as PrismaUser, Quote } from "@prisma/client"; 

// ✅ IMPORT DES SERVER ACTIONS (On bypass l'API Route)
import { getAgencyIncidentsAction, getAgencyArtisansAction, assignArtisanAction, resolveAgencyIncidentAction } from "./actions";


type IncidentWithDetails = Incident & {
  property: Property;
  reporter?: PrismaUser;
  assignedTo?: PrismaUser;
  quote?: Quote | null; // 🔒 CORRECTION : Ajout du type
};

export default function AgencyMaintenancePage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<IncidentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [artisans, setArtisans] = useState<Partial<PrismaUser>[]>([]); 
  const [loadingArtisans, setLoadingArtisans] = useState(false);

  // 1. NOUVEAU FETCH : 100% Server Action
  const fetchIncidents = async () => {
    try {
      const res = await getAgencyIncidentsAction(); 
      if (res.success && res.incidents) {
          setIncidents(res.incidents as unknown as IncidentWithDetails[]);
      } else {
          toast.error(res.error || "Erreur lors du chargement des données.");
      }
    } catch (e: any) {
      toast.error("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = async (incidentId: string) => {
      setSelectedIncidentId(incidentId);
      setIsModalOpen(true);
      setLoadingArtisans(true);
      
      try {
          const res = await getAgencyArtisansAction();
          if (res.success && res.artisans) {
              setArtisans(res.artisans);
          } else {
              toast.error(res.error);
          }
      } catch (error) {
          toast.error("Impossible de charger la liste des artisans.");
      } finally {
          setLoadingArtisans(false);
      }
  };

  const handleAssign = async (artisanId: string) => {
      if (!selectedIncidentId) return;
      try {
          const res = await assignArtisanAction(selectedIncidentId, artisanId);
          if (res.success) {
              toast.success("Artisan assigné au dossier.");
              setIsModalOpen(false);
              fetchIncidents(); 
          } else {
              toast.error(res.error);
          }
      } catch (e: any) {
          toast.error("Échec de l'assignation");
      }
  };

  const handleResolve = async (id: string) => {
    const { value: cost, isConfirmed } = await Swal.fire({
      title: "Clôturer le ticket ?",
      text: "Veuillez indiquer le coût final de la réparation en FCFA :",
      input: 'number',
      inputPlaceholder: 'Ex: 25000',
      showCancelButton: true,
      confirmButtonColor: "#ea580c", // Orange-600
      confirmButtonText: "Valider",
      cancelButtonText: "Annuler",
      background: "#0F172A", color: "#fff",
      inputValidator: (value) => (!value || Number(value) < 0) ? 'Le coût doit être un nombre positif' : null
    });

    if (isConfirmed && cost !== undefined) { 
      try {
        const res = await resolveAgencyIncidentAction(id, Number(cost));
        if (res.success) {
            toast.success("Ticket clôturé avec succès.");
            fetchIncidents();
        } else {
            toast.error(res.error);
        }
      } catch (e: any) { 
          toast.error("Erreur lors de la clôture."); 
      }
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0B1120]"><Loader2 className="animate-spin text-orange-500 w-12 h-12"/></div>;

  return (
    <div className="p-6 lg:p-10 bg-[#0B1120] min-h-screen text-white pb-20 font-sans">
      <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div>
            <h1 className="text-3xl font-black uppercase flex items-center gap-3"><Wrench className="text-orange-500"/> Gestion Technique</h1>
            <p className="text-slate-400 text-sm mt-2">Pilotez les interventions sur le parc immobilier de votre agence.</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-6xl mx-auto">
        {incidents.length === 0 ? (
           <div className="text-center p-10 bg-slate-900/50 rounded-3xl border border-slate-800 text-slate-500">
               Aucun ticket de maintenance en cours sur vos mandats.
           </div>
        ) : (
            incidents.map((inc) => (
                <div key={inc.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row gap-6 shadow-xl hover:border-slate-700 transition">
                    <div className="flex gap-5 flex-1">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 ${inc.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {inc.status === 'RESOLVED' ? <CheckCircle2 className="w-8 h-8"/> : <AlertCircle className="w-8 h-8"/>}
                        </div>
                        <div className="flex-1">
                            <Link href={`/dashboard/agency/maintenance/${inc.id}`} className="hover:underline flex items-center gap-2">
                                <h3 className="font-black text-xl text-white mb-1 uppercase">{inc.title}</h3>
                                <ExternalLink className="w-4 h-4 text-slate-500" />
                            </Link>
                            <p className="text-slate-400 text-sm mb-3">{inc.description}</p>
                            
                            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
                                <span className="bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">{inc.property?.title}</span>
                                {inc.assignedTo ? (
                                    <span className="bg-blue-900/30 px-2 py-1 rounded text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                        <Hammer className="w-3 h-3"/> {inc.assignedTo.name}
                                    </span>
                                ) : inc.status !== 'RESOLVED' && (
                                    <span className="text-orange-500 animate-pulse">En attente d&apos;attribution</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION BOUTONS D'ACTION */}
                    <div className="flex flex-col gap-2 w-full md:w-48">
                        {inc.status === 'QUOTATION' || inc.quote ? (
                            <Link 
                                href={`/dashboard/agency/maintenance/${inc.id}`}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-2 uppercase transition-colors text-center animate-pulse shadow-lg shadow-emerald-500/20"
                            >
                                <FileText className="w-4 h-4" /> Voir le devis
                            </Link>
                        ) : inc.status !== 'RESOLVED' ? (
                            <>
                                {!inc.assignedTo && (
                                    <button 
                                        onClick={() => openAssignModal(inc.id)}
                                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-2 uppercase transition-colors"
                                    >
                                        <User className="w-4 h-4" /> Assigner Artisan
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleResolve(inc.id)}
                                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-2 uppercase transition-colors"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Clôturer
                                </button>
                            </>
                        ) : (
                            <div className="text-center p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-emerald-500 font-bold text-xs uppercase flex flex-col items-center justify-center h-full">
                                <span>Terminé</span>
                                {inc.finalCost !== null && <span className="text-[10px] text-slate-400 mt-1">{inc.finalCost.toLocaleString()} FCFA</span>}
                            </div>
                        )}
                    </div>
                </div>
            ))
        )}
      </div>

      {/* MODALE ASSIGNATION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-[#0F172A] border border-slate-700 w-full max-w-md rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-white uppercase">Intervenant</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {loadingArtisans ? (
                        <div className="py-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/></div>
                    ) : (
                        artisans.map(artisan => (
                            <button key={artisan.id} onClick={() => handleAssign(artisan.id!)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 transition group text-left">
                                <div className="text-sm font-bold text-white">{artisan.name} <span className="text-[10px] text-slate-500 font-normal ml-2">{artisan.jobTitle}</span></div>
                                <ChevronRight className="w-4 h-4 text-slate-600"/>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
