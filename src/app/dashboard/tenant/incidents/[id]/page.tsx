"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  ArrowLeft, MapPin, Loader2, AlertCircle, 
  MessageCircle, ShieldCheck, Hammer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import IncidentChat from "@/components/shared/IncidentChat"; // ✅ Le composant Chat

export default function TenantIncidentDetail() {
  const { id } = useParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Récupérer l'incident
        // Si cette requête échoue (404), c'est que l'API n'est pas au bon endroit ou que le seed a cassé les IDs
        const res = await api.get(`/tenant/incidents/${id}`);
        
        if(res.data.success) {
            setIncident(res.data.incident);
        } else {
            // Si le dossier n'existe pas ou accès refusé -> Retour liste
            console.error("Erreur accès dossier:", res.data.error);
            router.push('/dashboard/tenant/incidents');
        }
        
        // 2. Récupérer l'utilisateur courant (Nécessaire pour identifier l'expéditeur dans le chat)
        const userRes = await api.get('/auth/session');
        if(userRes.data?.user) {
            setCurrentUser(userRes.data.user);
        }

      } catch (e) {
        console.error("Erreur chargement dossier:", e);
        // En cas de crash critique, on redirige aussi
        // router.push('/dashboard/tenant/incidents'); 
      } finally { 
        setLoading(false); 
      }
    };
    
    if (id) fetchData();
  }, [id, router]);

  if (loading) return (
    <div className="h-screen bg-[#060B18] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 w-10 h-10"/>
    </div>
  );

  if (!incident) return null;

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-200 p-4 md:p-10 pb-20 font-sans">
        
        {/* HEADER NAVIGATION */}
        <div className="max-w-6xl mx-auto mb-8">
            <Button 
                onClick={() => router.back()} 
                variant="ghost" 
                className="mb-6 pl-0 hover:bg-transparent text-slate-500 hover:text-white transition-colors group text-xs font-black uppercase tracking-widest"
            >
                <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform"/> Retour à la liste
            </Button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                         <Badge className={`
                            ${incident.status === 'RESOLVED' ? 'bg-emerald-500' : 
                              incident.status === 'IN_PROGRESS' ? 'bg-blue-500' : 
                              'bg-orange-500'} text-white border-none px-3 py-1 text-[10px] tracking-widest uppercase font-black
                         `}>
                             {incident.status === 'OPEN' ? 'En Attente' : incident.status === 'IN_PROGRESS' ? 'En Cours' : 'Clôturé'}
                         </Badge>
                         <span className="text-xs text-slate-500 font-mono">Dossier #{incident.id.slice(0,8)}</span>
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">{incident.title}</h1>
                </div>
                
                {/* BLOC ARTISAN ASSIGNÉ */}
                {incident.assignedTo && (
                    <div className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                        <div className="bg-orange-500/10 p-2 rounded-full">
                            <Hammer className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Artisan Assigné</span>
                            <span className="text-sm font-bold text-white">{incident.assignedTo.name}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE : INFOS DU CHANTIER */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Description */}
                <div className="bg-[#0F172A] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] rounded-full pointer-events-none"></div>
                     
                     <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Description du problème
                     </h3>
                     <p className="text-slate-300 text-lg leading-relaxed font-medium italic">
                        "{incident.description}"
                     </p>

                     {/* Photos (Si existantes) */}
                     {incident.photos && incident.photos.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-white/5">
                            <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-4">Preuves visuelles</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {incident.photos.map((url: string, i: number) => (
                                    <div key={i} className="aspect-square bg-slate-800 rounded-xl overflow-hidden border border-white/10 group cursor-pointer">
                                        <img src={url} alt="Preuve" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity hover:scale-105 duration-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                     )}
                </div>
            </div>

            {/* COLONNE DROITE : TCHAT & ACTION */}
            <div className="lg:col-span-1">
                {incident.assignedTo ? (
                    <div className="sticky top-6 space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 px-1">
                             <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                             </span>
                             Messagerie Directe
                        </div>
                        
                        {/* ✅ COMPOSANT TCHAT SÉCURISÉ */}
                        <div className="border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                             <IncidentChat 
                                incidentId={incident.id} 
                                currentUserId={currentUser?.id} 
                            />
                        </div>

                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-blue-300 leading-relaxed font-medium">
                                Utilisez ce chat pour convenir des RDV. Toutes les conversations sont enregistrées pour votre sécurité.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl p-10 text-center mt-4">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-slate-800/50">
                            <MessageCircle className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">En attente d'assignation</h3>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                            Dès qu'un artisan acceptera la mission, le tchat sécurisé s'ouvrira automatiquement ici.
                        </p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
