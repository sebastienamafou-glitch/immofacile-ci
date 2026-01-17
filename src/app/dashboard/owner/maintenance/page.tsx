"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { api } from "@/lib/api";
import { Loader2, AlertCircle, CheckCircle2, Clock, Wrench, Home } from "lucide-react";
import Swal from "sweetalert2";

// ✅ 1. TYPAGE STRICT (Pour éviter les bugs silencieux)
interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'RESOLVED' | 'IN_PROGRESS';
  createdAt: string;
  propertyTitle: string; // Champ ajouté lors du mapping
}

export default function MaintenancePage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    // 1. SÉCURITÉ AUTH
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("immouser");
    if (!stored) {
        router.push('/login');
        return;
    }
    const user = JSON.parse(stored);

    try {
      // 2. APPEL API
      const res = await api.get('/owner/dashboard', {
          headers: { 'x-user-email': user.email }
      });

      if (res.data.success) {
        // ✅ 3. SÉCURISATION DU MAPPING (Le point critique)
        // On utilise ( || []) pour garantir que ce sont des tableaux, même si l'API renvoie null
        const rawProperties = res.data.properties || [];

        const allIncidents: Incident[] = rawProperties.flatMap((p: any) => {
            const propIncidents = p.incidents || []; // Sécurité ici aussi
            
            return propIncidents.map((i: any) => ({
                id: i.id,
                title: i.title || "Incident technique",
                description: i.description || "Pas de description",
                status: i.status || "OPEN",
                createdAt: i.createdAt || new Date().toISOString(),
                propertyTitle: p.title || "Bien Inconnu"
            }));
        });

        // Tri par date (plus récent en haut)
        allIncidents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setIncidents(allIncidents);
      }
    } catch (e) {
      console.error("Erreur chargement incidents", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  const handleResolve = async (id: string) => {
    const stored = localStorage.getItem("immouser");
    if (!stored) return;
    const user = JSON.parse(stored);

    const confirm = await Swal.fire({
      title: "Clôturer l'incident ?",
      text: "Cela confirmera que les réparations sont terminées.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10B981", // Emerald Green
      cancelButtonColor: "#334155",
      confirmButtonText: "Oui, c'est réparé",
      cancelButtonText: "Annuler",
      background: "#0F172A", 
      color: "#fff"
    });

    if (confirm.isConfirmed) {
      try {
        await api.post('/owner/incidents/resolve', { incidentId: id }, {
            headers: { 'x-user-email': user.email }
        });
        
        // Feedback positif
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
            timerProgressBar: true, background: '#10B981', color: '#fff'
        });
        Toast.fire({ icon: 'success', title: 'Incident résolu !' });

        fetchIncidents(); // Rafraîchir la liste
      } catch (e) {
        Swal.fire({ title: "Erreur", text: "Impossible de mettre à jour.", icon: "error", background: "#0F172A", color: "#fff" });
      }
    }
  };

  if (loading) return (
    <div className="flex min-h-screen flex-col gap-4 items-center justify-center bg-[#0B1120]">
        <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
        <p className="text-slate-500 text-sm font-mono animate-pulse">Analyse des rapports techniques...</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 bg-[#0B1120] min-h-screen text-white pb-20">
      <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div>
            <h1 className="text-3xl font-black uppercase flex items-center gap-3 tracking-tight">
            <Wrench className="text-orange-500" /> Maintenance
            </h1>
            <p className="text-slate-400 text-sm mt-2">Suivez et résolvez les incidents signalés par vos locataires.</p>
        </div>
        <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-400">
            {incidents.filter(i => i.status !== 'RESOLVED').length} en cours
        </div>
      </div>

      <div className="grid gap-6 max-w-5xl mx-auto">
        {incidents.length > 0 ? (
            incidents.map((inc) => (
            <div key={inc.id} className="group bg-slate-900/50 border border-slate-800 hover:border-orange-500/30 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-xl gap-6 transition-all duration-300">
                
                <div className="flex gap-5 w-full md:w-auto">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner ${
                        inc.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500 animate-pulse'
                    }`}>
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    
                    <div className="flex-1">
                        <h3 className="font-black text-xl text-white mb-1">{inc.title}</h3>
                        <p className="text-slate-400 text-sm mb-4 leading-relaxed max-w-xl">{inc.description}</p>
                        
                        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg text-slate-400 border border-white/5">
                                <Home className="w-3 h-3 text-orange-500"/> {inc.propertyTitle}
                            </span>
                            <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg text-slate-400 border border-white/5">
                                <Clock className="w-3 h-3 text-blue-500"/> {new Date(inc.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-auto flex justify-end">
                    {inc.status === 'RESOLVED' ? (
                        <span className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase bg-emerald-500/10 px-5 py-3 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4" /> Résolu
                        </span>
                    ) : (
                        <button 
                        onClick={() => handleResolve(inc.id)}
                        className="w-full md:w-auto bg-orange-500 hover:bg-orange-400 text-black font-black px-6 py-3 rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] flex items-center justify-center gap-2"
                        >
                        <Wrench className="w-4 h-4" />
                        CLÔTURER
                        </button>
                    )}
                </div>
            </div>
            ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[2rem]">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Tout va bien !</h3>
            <p className="text-slate-500 font-medium text-sm">Aucun incident technique n'a été signalé.</p>
          </div>
        )}
      </div>
    </div>
  );
}
