"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { api } from "@/lib/api";
import { Loader2, AlertCircle, CheckCircle2, Clock, Wrench, Home, User, DollarSign, Plus } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Incident, Property, User as PrismaUser } from "@prisma/client";

// TYPAGE STRICT (Extension des types Prisma pour les jointures)
type IncidentWithDetails = Incident & {
  property: Property;
  reporter?: PrismaUser;
};

export default function MaintenancePage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<IncidentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. CHARGEMENT DES TICKETS (ZERO TRUST)
  const fetchIncidents = async () => {
    try {
      // ✅ APPEL SÉCURISÉ : L'authentification passe par le Cookie HTTP-Only
      const res = await api.get('/owner/incidents');

      if (res.data.success) {
        setIncidents(res.data.incidents);
      }
    } catch (e: any) {
      console.error("Erreur chargement incidents", e);
      // Redirection automatique si la session est expirée
      if (e.response?.status === 401) {
          router.push('/login');
      } else {
          toast.error("Impossible de charger les tickets de maintenance.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  // 2. ACTION : RÉSOUDRE UN INCIDENT
  const handleResolve = async (id: string) => {
    // Modale de saisie du coût (SweetAlert2)
    const { value: cost } = await Swal.fire({
      title: "Clôturer le ticket ?",
      text: "Veuillez saisir le coût final de la réparation (si applicable) pour la comptabilité.",
      input: 'number',
      inputLabel: 'Coût total (FCFA)',
      inputPlaceholder: 'Ex: 15000',
      inputValue: 0,
      showCancelButton: true,
      confirmButtonColor: "#F59E0B", // Orange ImmoFacile
      cancelButtonColor: "#334155",
      confirmButtonText: "Valider la réparation",
      cancelButtonText: "Annuler",
      background: "#0F172A", 
      color: "#fff",
      customClass: {
        input: 'text-black font-bold'
      }
    });

    // Si l'utilisateur n'a pas annulé
    if (cost !== undefined) { 
      try {
        // ✅ MISE À JOUR SÉCURISÉE
        await api.put('/owner/incidents', { 
            id, 
            status: 'RESOLVED',
            finalCost: Number(cost) // Typage strict
        });
        
        toast.success("Incident clôturé et archivé !");
        fetchIncidents(); // Rafraîchir la liste pour voir les changements
      } catch (e) {
        console.error(e);
        toast.error("Erreur lors de la clôture du ticket.");
      }
    }
  };

  if (loading) return (
    <div className="flex min-h-screen flex-col gap-4 items-center justify-center bg-[#0B1120]">
        <Loader2 className="animate-spin text-[#F59E0B] w-12 h-12" />
        <p className="text-slate-500 text-sm font-mono animate-pulse">Chargement des opérations...</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 bg-[#0B1120] min-h-screen text-white pb-20 font-sans">
      
      {/* HEADER AVEC ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-slate-800 pb-6">
        <div>
            <h1 className="text-3xl font-black uppercase flex items-center gap-3 tracking-tight">
                <Wrench className="text-[#F59E0B] w-8 h-8" /> Maintenance
            </h1>
            <p className="text-slate-400 text-sm mt-2">Suivi des réparations et interventions techniques.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
             {/* Compteur de tickets */}
             <div className="bg-slate-900 px-4 py-3 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${incidents.some(i => i.status !== 'RESOLVED') ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                {incidents.filter(i => i.status !== 'RESOLVED').length} En cours
            </div>

            {/* BOUTON CRÉATION (NOUVEAU) */}
            <Link 
                href="/dashboard/owner/incidents/new"
                className="bg-[#F59E0B] hover:bg-yellow-500 text-black px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition active:scale-95 uppercase tracking-wider"
            >
                <Plus className="w-4 h-4" /> Signaler une panne
            </Link>
        </div>
      </div>

      {/* GRILLE DES INCIDENTS */}
      <div className="grid gap-6 max-w-6xl mx-auto">
        {incidents.length > 0 ? (
            incidents.map((inc) => (
            <div key={inc.id} className="group bg-slate-900/50 border border-slate-800 hover:border-[#F59E0B]/50 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-xl gap-6 transition-all duration-300">
                
                <div className="flex gap-5 w-full md:w-auto">
                    {/* ICONE STATUS */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner ${
                        inc.status === 'RESOLVED' 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : 'bg-red-500/10 text-red-500 animate-pulse'
                    }`}>
                        {inc.status === 'RESOLVED' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                    </div>
                    
                    <div className="flex-1">
                        <h3 className="font-black text-xl text-white mb-2">{inc.title}</h3>
                        <p className="text-slate-400 text-sm mb-4 leading-relaxed max-w-xl bg-black/20 p-3 rounded-lg border border-white/5">
                            {inc.description}
                        </p>
                        
                        {/* TAGS D'INFORMATION */}
                        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 border border-slate-700">
                                <Home className="w-3 h-3 text-[#F59E0B]"/> {inc.property?.title || "Propriété inconnue"}
                            </span>
                            <span className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 border border-slate-700">
                                <Clock className="w-3 h-3 text-blue-500"/> {new Date(inc.createdAt).toLocaleDateString()}
                            </span>
                            {inc.reporter && (
                                <span className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 border border-slate-700">
                                    <User className="w-3 h-3 text-purple-500"/> {inc.reporter.name || "Utilisateur"}
                                </span>
                            )}
                            {/* Affichage du Coût si résolu */}
                            {inc.finalCost !== null && inc.finalCost > 0 && (
                                <span className="flex items-center gap-1.5 bg-emerald-900/20 px-3 py-1.5 rounded-lg text-emerald-400 border border-emerald-500/30">
                                    <DollarSign className="w-3 h-3"/> Coût: {inc.finalCost.toLocaleString()} F
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* BOUTONS D'ACTION */}
                <div className="w-full md:w-auto flex justify-end">
                    {inc.status === 'RESOLVED' ? (
                        <span className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase bg-emerald-500/10 px-6 py-4 rounded-xl border border-emerald-500/20 cursor-default select-none">
                            <CheckCircle2 className="w-4 h-4" /> Incident Clos
                        </span>
                    ) : (
                        <button 
                            onClick={() => handleResolve(inc.id)}
                            className="w-full md:w-auto bg-[#F59E0B] hover:bg-yellow-500 text-black font-black px-6 py-4 rounded-xl text-xs transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 flex items-center justify-center gap-2 active:scale-95 uppercase tracking-wider"
                        >
                            <Wrench className="w-4 h-4" />
                            Marquer comme résolu
                        </button>
                    )}
                </div>
            </div>
            ))
        ) : (
          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[2rem] animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Aucun incident à traiter</h3>
            <p className="text-slate-500 font-medium text-sm mb-6">Tout semble fonctionner correctement dans vos propriétés.</p>
            
            <Link href="/dashboard/owner/incidents/new" className="text-[#F59E0B] font-bold border-b border-[#F59E0B] pb-1 hover:text-white hover:border-white transition text-sm">
                Signaler un problème manuellement
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
