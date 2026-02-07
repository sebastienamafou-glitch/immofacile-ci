import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { 
  MapPin, Calendar, Clock, CheckCircle, XCircle, 
  AlertCircle, ArrowRight, Navigation 
} from "lucide-react";
import VisitActionButtons from "@/components/agent/VisitActionButtons"; // Composant Client à créer ci-dessous

export const dynamic = 'force-dynamic';

export default async function AgentVisitsPage() {
  // 1. SÉCURITÉ
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  // 2. DATA FETCHING (Visites assignées)
  const visits = await prisma.mission.findMany({
    where: {
        agentId: userId,
        type: "VISITE"
    },
    include: {
        property: {
            select: {
                id: true,
                title: true,
                address: true,
                commune: true,
                images: true
            }
        }
    },
    orderBy: { dateScheduled: 'asc' } // Les plus proches d'abord
  });

  // Tri simple
  const upcomingVisits = visits.filter(v => v.status === 'PENDING' || v.status === 'ACCEPTED');
  const pastVisits = visits.filter(v => v.status === 'COMPLETED' || v.status === 'CANCELLED');

  // Helper date
  const formatDate = (date: Date | null) => {
    if (!date) return "Date à définir";
    return new Intl.DateTimeFormat('fr-FR', { 
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
    }).format(date);
  };

  return (
    <div className="p-6 space-y-8 bg-[#020617] min-h-screen text-slate-300">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <Navigation className="text-orange-500" /> Mes Visites
            </h1>
            <p className="text-sm text-slate-500">Planning des présentations de biens.</p>
        </div>
        <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10 text-xs font-mono">
            {upcomingVisits.length} à venir
        </div>
      </div>

      {/* SECTION 1: À VENIR */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-orange-500">Planning Actif</h2>
        
        {upcomingVisits.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center">
                <p className="text-slate-500">Aucune visite programmée pour le moment.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingVisits.map((visit) => (
                    <div key={visit.id} className="bg-[#0B1120] border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/30 transition group">
                        {/* Image Bien */}
                        <div className="h-32 bg-slate-800 relative">
                            {visit.property.images[0] ? (
                                <img src={visit.property.images[0]} alt="Bien" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs uppercase font-bold text-slate-600">No Image</div>
                            )}
                            <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                visit.status === 'ACCEPTED' ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-orange-500 text-black border-orange-400'
                            }`}>
                                {visit.status === 'PENDING' ? 'En Attente' : 'Confirmée'}
                            </div>
                        </div>

                        {/* Contenu */}
                        <div className="p-5 space-y-4">
                            <div>
                                <h3 className="text-white font-bold truncate">{visit.property.title}</h3>
                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                    <MapPin className="w-3 h-3 text-orange-500" />
                                    {visit.property.commune}
                                </div>
                            </div>

                            <div className="bg-white/5 p-3 rounded-lg flex items-center gap-3">
                                <Calendar className="w-8 h-8 text-slate-500" />
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Rendez-vous</p>
                                    <p className="text-sm text-white font-mono">{formatDate(visit.dateScheduled)}</p>
                                </div>
                            </div>

                            {/* COMPOSANT CLIENT POUR LES ACTIONS */}
                            <VisitActionButtons missionId={visit.id} status={visit.status} />
                        </div>
                    </div>
                ))}
            </div>
        )}
      </section>

      {/* SECTION 2: HISTORIQUE */}
      <section className="space-y-4 pt-8 border-t border-white/5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Historique</h2>
        <div className="bg-[#0B1120] rounded-xl overflow-hidden border border-white/5">
            {pastVisits.map((visit) => (
                <div key={visit.id} className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition">
                    <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${visit.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div>
                            <p className="text-sm font-bold text-slate-300">{visit.property.title}</p>
                            <p className="text-xs text-slate-600">{formatDate(visit.dateScheduled)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         {visit.status === 'COMPLETED' ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-500 font-bold border border-emerald-500/20 px-2 py-1 rounded-full bg-emerald-500/10">
                                <CheckCircle className="w-3 h-3"/> Effectuée
                            </span>
                         ) : (
                            <span className="flex items-center gap-1 text-xs text-red-500 font-bold border border-red-500/20 px-2 py-1 rounded-full bg-red-500/10">
                                <XCircle className="w-3 h-3"/> Annulée
                            </span>
                         )}
                    </div>
                </div>
            ))}
            {pastVisits.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-600 italic">Aucun historique disponible.</div>
            )}
        </div>
      </section>
    </div>
  );
}
