"use client";

import { useEffect, useState } from "react";
import { 
  Wrench, Clock, Plus, Hammer, Loader2,
  ArrowLeft, ShieldCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Swal from "sweetalert2";
import Link from "next/link";

// 1. TYPAGE STRICT (Best Practice)
interface Incident {
  id: string;
  type: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  description: string;
  createdAt: string;
  assignedTo?: {
    name: string;
    phone?: string;
  } | null;
}

export default function TenantIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]); // Typage appliqué
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      // On appelle la route dédiée (plus propre que dashboard global)
      const res = await api.get('/tenant/incidents'); 
      if (res.data.success) {
        setIncidents(res.data.incidents || []);
      }
    } catch (error) {
      console.error("Erreur incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReportIncident = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Signaler un incident',
      html: `
        <div class="space-y-4 text-left font-sans mt-4">
          <div>
            <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Type de problème</label>
            <select id="swal-type" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mt-1 outline-none focus:border-orange-500 transition">
              <option value="PLOMBERIE">Plomberie</option>
              <option value="ELECTRICITE">Électricité</option>
              <option value="MACONNERIE">Maçonnerie</option>
              <option value="CLIMATISATION">Climatisation</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
          <div>
            <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
            <textarea id="swal-desc" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mt-1 outline-none focus:border-orange-500 h-24" placeholder="Décrivez le problème en détails..."></textarea>
          </div>
          <div class="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl">
            <p className="text-[9px] text-orange-500 font-bold uppercase italic">Note technique</p>
            <p className="text-[10px] text-slate-500 leading-tight mt-1">Votre signalement sera transmis instantanément au bailleur pour assignation d'un artisan spécialisé.</p>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Envoyer le signalement',
      confirmButtonColor: '#F59E0B',
      background: '#0F172A', color: '#fff',
      customClass: { popup: 'border border-white/10 rounded-[2.5rem] p-8' },
      preConfirm: () => {
        const typeEl = document.getElementById('swal-type') as HTMLSelectElement;
        const descEl = document.getElementById('swal-desc') as HTMLTextAreaElement;
        if (!descEl.value) {
            Swal.showValidationMessage('La description est obligatoire');
            return false;
        }
        return { type: typeEl.value, description: descEl.value };
      }
    });

    if (formValues) {
      setSubmitting(true);
      try {
        await api.post('/tenant/incidents', formValues); 
        Swal.fire({ icon: 'success', title: 'Signalé !', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#10B981', color: '#fff' });
        fetchIncidents(); // Rafraîchir la liste
      } catch (e) {
        Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'envoyer le signalement.', background: '#0F172A', color: '#fff' });
      } finally {
        setSubmitting(false);
      }
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'OPEN': return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case 'IN_PROGRESS': return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case 'RESOLVED': return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      default: return "text-slate-500 bg-slate-500/10 border-slate-500/20";
    }
  };

  if (loading) return <div className="min-h-screen bg-[#060B18] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>;

  return (
    <main className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 pb-20 relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 blur-[120px] rounded-full opacity-50"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
                <Link href="/dashboard/tenant" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors mb-4 group">
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Retour Dashboard
                </Link>
                <h1 className="text-4xl font-black text-white tracking-tighter italic">Maintenance & <span className="text-orange-500">Support</span></h1>
                <p className="text-slate-500 text-sm mt-1 font-medium">Gérez vos demandes d'intervention technique.</p>
            </div>
            <Button 
                onClick={handleReportIncident}
                disabled={submitting}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-black px-8 py-6 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-3 uppercase tracking-widest text-xs"
            >
                <Plus className="w-5 h-5" /> Nouveau Signalement
            </Button>
        </div>

        {/* LISTE DES INCIDENTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incidents.length > 0 ? incidents.map((incident) => (
                <Card key={incident.id} className="bg-[#0F172A]/50 border-white/5 rounded-[2.5rem] backdrop-blur-xl hover:border-white/10 transition-all group overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-400 group-hover:text-orange-500 transition-colors`}>
                                <Wrench className="w-5 h-5" />
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(incident.status)}`}>
                                {incident.status === 'OPEN' ? 'Signalé' : incident.status === 'IN_PROGRESS' ? 'En cours' : 'Résolu'}
                            </span>
                        </div>
                        <CardTitle className="text-white text-lg font-black italic uppercase tracking-tight">{incident.type}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3 font-medium italic">
                            "{incident.description}"
                        </p>
                        
                        {/* Barre d'état visuelle */}
                        <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Signalé le</span>
                                <span className="text-xs font-bold text-slate-300">{new Date(incident.createdAt).toLocaleDateString()}</span>
                            </div>
                            
                            {/* Affichage de l'artisan si assigné */}
                            {incident.assignedTo ? (
                                <div className="flex items-center gap-2 ml-auto">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                        <Hammer className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-bold text-blue-500 uppercase">Artisan en route</span>
                                        <span className="text-[10px] font-bold text-white truncate max-w-[80px]">{incident.assignedTo.name}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 ml-auto text-slate-600">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-[9px] font-bold uppercase">En attente artisan</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )) : (
                <div className="col-span-full py-24 text-center">
                    <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner">
                        <ShieldCheck className="w-10 h-10 text-slate-700" />
                    </div>
                    <h3 className="text-xl font-black text-white italic mb-2">Tout est en ordre !</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">Vous n'avez aucun incident technique signalé pour le moment.</p>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}
