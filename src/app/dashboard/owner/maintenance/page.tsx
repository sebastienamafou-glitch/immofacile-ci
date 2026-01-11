"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Pour la redirection propre
import { api } from "@/lib/api";
import { Loader2, AlertCircle, CheckCircle2, Clock, Wrench, Home } from "lucide-react";
import Swal from "sweetalert2";

export default function MaintenancePage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    // 1. RÉCUPÉRATION DE L'UTILISATEUR (La clé de la sécurité)
    const stored = localStorage.getItem("immouser");
    if (!stored) {
        router.push('/login');
        return;
    }
    const user = JSON.parse(stored);

    try {
      // 2. APPEL API SÉCURISÉ (Avec le Header)
      const res = await api.get('/owner/dashboard', {
          headers: { 'x-user-email': user.email }
      });

      if (res.data.success) {
        // On extrait les incidents (logique conservée)
        const allIncidents = res.data.properties.flatMap((p: any) => 
          p.incidents ? p.incidents.map((i: any) => ({ ...i, propertyTitle: p.title })) : []
        );
        setIncidents(allIncidents);
      }
    } catch (e) {
      console.error("Erreur chargement incidents", e);
      // Optionnel : Gérer l'erreur visuellement
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
      title: "Marquer comme résolu ?",
      text: "Confirmez-vous que les travaux ont été effectués ?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      background: "#0F172A", color: "#fff"
    });

    if (confirm.isConfirmed) {
      try {
        // On sécurise aussi cet appel POST
        await api.post('/owner/incidents/resolve', { incidentId: id }, {
            headers: { 'x-user-email': user.email }
        });
        Swal.fire({ title: "Succès", icon: "success", background: "#0F172A", color: "#fff" });
        fetchIncidents(); // Recharger la liste
      } catch (e) {
        Swal.fire({ title: "Erreur", icon: "error", background: "#0F172A", color: "#fff" });
      }
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#0B1120]"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>;

  return (
    <div className="p-6 lg:p-10 bg-[#0B1120] min-h-screen text-white pb-20">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black uppercase flex items-center gap-3">
          <Wrench className="text-orange-500" /> Maintenance & Pannes
        </h1>
      </div>

      <div className="grid gap-6">
        {incidents.length > 0 ? (
            incidents.map((inc) => (
            <div key={inc.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-xl gap-4">
                <div className="flex gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${inc.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="font-black text-xl">{inc.title || "Incident technique"}</h3>
                    <p className="text-slate-400 text-sm mb-2">{inc.description}</p>
                    <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1 text-slate-500"><Home className="w-3 h-3"/> {inc.propertyTitle}</span>
                    <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3 h-3"/> {new Date(inc.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                </div>
                </div>

                <div>
                {inc.status === 'RESOLVED' ? (
                    <span className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase bg-emerald-500/10 px-4 py-2 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" /> Résolu
                    </span>
                ) : (
                    <button 
                    onClick={() => handleResolve(inc.id)}
                    className="bg-orange-500 text-black font-black px-6 py-2 rounded-xl text-xs hover:bg-orange-400 transition shadow-lg shadow-orange-500/20 whitespace-nowrap"
                    >
                    MARQUER RÉSOLU
                    </button>
                )}
                </div>
            </div>
            ))
        ) : (
          <div className="text-center py-20 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl">
            <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aucune panne signalée pour le moment</p>
          </div>
        )}
      </div>
    </div>
  );
}
