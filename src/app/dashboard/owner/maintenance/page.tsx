"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { api } from "@/lib/api";
import { Loader2, AlertCircle, CheckCircle2, Wrench, User, Plus, Hammer, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Incident, Property, User as PrismaUser } from "@prisma/client";

// Types étendus
type IncidentWithDetails = Incident & {
  property: Property;
  reporter?: PrismaUser;
  assignedTo?: PrismaUser;
};

export default function MaintenancePage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<IncidentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- STATE MODALE ASSIGNATION ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [artisans, setArtisans] = useState<PrismaUser[]>([]); // Liste des artisans disponibles
  const [loadingArtisans, setLoadingArtisans] = useState(false);

  // 1. CHARGEMENT
  const fetchIncidents = async () => {
    try {
      const res = await api.get('/owner/maintenance');
      if (res.data.success) setIncidents(res.data.incidents);
    } catch (e: any) {
      if (e.response?.status === 401) router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // 2. RÉCUPÉRER LES ARTISANS (Au clic sur "Assigner")
  const openAssignModal = async (incidentId: string) => {
      setSelectedIncidentId(incidentId);
      setIsModalOpen(true);
      setLoadingArtisans(true);
      
      try {
          const res = await api.get('/owner/artisans'); 
          if (res.data.success) {
              setArtisans(res.data.artisans);
          }
      } catch (error) {
          console.error("Erreur artisans", error);
      } finally {
          setLoadingArtisans(false);
      }
  };

  // 3. ASSIGNER L'ARTISAN
  const handleAssign = async (artisanId: string) => {
      if (!selectedIncidentId) return;
      try {
          await api.put('/owner/incidents', {
              id: selectedIncidentId,
              assignedToId: artisanId
          });
          toast.success("Artisan assigné ! Le dossier est en cours.");
          setIsModalOpen(false);
          fetchIncidents(); // Rafraîchir la liste
      } catch (e) {
          toast.error("Échec de l'assignation");
      }
  };

  // 4. CLÔTURER
  const handleResolve = async (id: string) => {
    const { value: cost } = await Swal.fire({
      title: "Clôturer le ticket ?",
      text: "Coût final (Matériel + Main d'œuvre) :",
      input: 'number',
      inputValue: 0,
      showCancelButton: true,
      confirmButtonColor: "#F59E0B",
      confirmButtonText: "Valider la réparation",
      cancelButtonText: "Annuler",
      background: "#0F172A", color: "#fff"
    });

    if (cost !== undefined) { 
      try {
        await api.put('/owner/incidents', { id, status: 'RESOLVED', finalCost: Number(cost) });
        toast.success("Ticket clôturé.");
        fetchIncidents();
      } catch (e) { toast.error("Erreur clôture."); }
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0B1120]"><Loader2 className="animate-spin text-[#F59E0B] w-12 h-12"/></div>;

  return (
    <div className="p-6 lg:p-10 bg-[#0B1120] min-h-screen text-white pb-20 font-sans relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div>
            <h1 className="text-3xl font-black uppercase flex items-center gap-3"><Wrench className="text-[#F59E0B]"/> Maintenance</h1>
            <p className="text-slate-400 text-sm mt-2">Gestion des interventions techniques.</p>
        </div>
        <Link href="/dashboard/owner/maintenance/new" className="bg-[#F59E0B] text-black px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 uppercase">
            <Plus className="w-4 h-4" /> Signaler une panne
        </Link>
      </div>

      {/* LISTE */}
      <div className="grid gap-6 max-w-6xl mx-auto">
        {incidents.map((inc) => (
            <div key={inc.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row gap-6 shadow-xl hover:border-slate-700 transition">
                
                <div className="flex gap-5 flex-1">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 ${inc.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {inc.status === 'RESOLVED' ? <CheckCircle2 className="w-8 h-8"/> : <AlertCircle className="w-8 h-8"/>}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-xl text-white mb-1 uppercase">{inc.title}</h3>
                        <p className="text-slate-400 text-sm mb-3">{inc.description}</p>
                        
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <span className="bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">{inc.property?.title}</span>
                            
                            {/* Affichage Artisan */}
                            {inc.assignedTo ? (
                                <span className="bg-blue-900/30 px-2 py-1 rounded text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                    <Hammer className="w-3 h-3"/> {inc.assignedTo.name}
                                </span>
                            ) : inc.status !== 'RESOLVED' && (
                                <span className="text-orange-500 animate-pulse">En attente d'attribution</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex flex-col gap-2 w-full md:w-48">
                    {inc.status !== 'RESOLVED' ? (
                        <>
                            {!inc.assignedTo && (
                                <button 
                                    onClick={() => openAssignModal(inc.id)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-2 uppercase"
                                >
                                    <User className="w-4 h-4" /> Assigner Artisan
                                </button>
                            )}
                            <button 
                                onClick={() => handleResolve(inc.id)}
                                className="bg-[#F59E0B] hover:bg-yellow-500 text-black font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-2 uppercase"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Clôturer
                            </button>
                        </>
                    ) : (
                        <div className="text-center p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-emerald-500 font-bold text-xs uppercase">
                            Terminé
                        </div>
                    )}
                </div>
            </div>
        ))}
      </div>

      {/* --- MODALE ASSIGNATION ARTISAN --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0F172A] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 className="font-bold text-white uppercase tracking-wider">Choisir un intervenant</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {loadingArtisans ? (
                        <div className="py-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/>Chargement...</div>
                    ) : artisans.length > 0 ? (
                        <div className="space-y-1">
                            {artisans.map(artisan => (
                                <button 
                                    key={artisan.id}
                                    onClick={() => handleAssign(artisan.id)}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 transition group text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                                            {artisan.name?.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white group-hover:text-[#F59E0B]">{artisan.name}</div>
                                            <div className="text-[10px] text-slate-400 uppercase">{artisan.jobTitle || "Technicien"}</div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white"/>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-slate-500">
                            <p>Aucun artisan trouvé.</p>
                            <Link href="/dashboard/owner/agency" className="text-[#F59E0B] text-xs underline mt-2 block">
                                Ajouter un membre à l'équipe
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
