"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api"; // ✅ Utilisation de votre client API réel
import { 
  CalendarDays, MapPin, Clock, Phone, User, 
  Calendar, ChevronRight, Loader2, AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner"; // Pour les erreurs

interface ScheduleItem {
  id: string;
  title: string;
  date: string;
  timeSlot?: string;
  address: string;
  clientName: string;
  clientPhone: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
}

export default function ArtisanSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [interventions, setInterventions] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    const fetchSchedule = async () => {
        try {
            // ✅ APPEL RÉEL À L'API
            const res = await api.get('/artisan/schedule');
            
            // Si l'API renvoie un tableau, on l'utilise
            if (Array.isArray(res.data)) {
                setInterventions(res.data);
            }
        } catch (e) {
            console.error("Erreur chargement planning:", e);
            toast.error("Impossible de charger votre emploi du temps.");
        } finally {
            setLoading(false);
        }
    };
    fetchSchedule();
  }, []);

  if (loading) return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-mono">Synchronisation de l'agenda...</p>
      </div>
  );

  // Grouper par date (Logique d'affichage)
  const today = new Date().toLocaleDateString();
  const todaysJobs = interventions.filter(i => new Date(i.date).toLocaleDateString() === today);
  const upcomingJobs = interventions.filter(i => new Date(i.date).toLocaleDateString() !== today);

  return (
    <div className="p-6 md:p-10 text-slate-200 font-sans min-h-screen">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <CalendarDays className="w-8 h-8 text-orange-500" />
          </div>
          <div>
              <h1 className="text-2xl font-black text-white">Mon Planning</h1>
              <p className="text-slate-400 text-sm">Gérez vos rendez-vous et vos interventions.</p>
          </div>
      </div>

      {interventions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl">
              <Calendar className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-400">Agenda vide</h3>
              <p className="text-slate-500 mt-2">Aucune intervention planifiée pour le moment.</p>
          </div>
      ) : (
        <>
            {/* SECTION AUJOURD'HUI */}
            <div className="mb-10">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> Aujourd'hui
                </h2>
                
                <div className="space-y-4">
                    {todaysJobs.length === 0 ? (
                        <p className="text-slate-500 text-sm italic ml-4">Rien de prévu aujourd'hui.</p>
                    ) : (
                        todaysJobs.map(job => (
                            <Card key={job.id} className="bg-slate-900 border-l-4 border-l-emerald-500 border-y-slate-800 border-r-slate-800 shadow-lg hover:bg-slate-800/50 transition-colors">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 px-3 py-1 text-xs">
                                                    {job.status === 'COMPLETED' ? 'TERMINÉ' : 'CONFIRMÉ'}
                                                </Badge>
                                                <span className="text-xl font-bold text-white">{job.timeSlot}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white">{job.title}</h3>
                                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                                                {job.address}
                                            </div>
                                        </div>

                                        <div className="bg-black/20 p-4 rounded-xl border border-slate-800 min-w-[250px] flex flex-col justify-center">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs">
                                                    <User className="w-4 h-4"/>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{job.clientName}</p>
                                                    <p className="text-xs text-slate-500">Contact sur place</p>
                                                </div>
                                            </div>
                                            <a href={`tel:${job.clientPhone}`} className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition text-sm font-bold bg-emerald-500/10 px-3 py-2 rounded-lg w-fit mt-1">
                                                <Phone className="w-4 h-4" /> {job.clientPhone}
                                            </a>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* SECTION À VENIR */}
            {upcomingJobs.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400"/> À venir
                    </h2>
                    
                    <div className="grid gap-4">
                        {upcomingJobs.map(job => (
                            <div key={job.id} className="group flex items-center bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-orange-500/30 transition-all cursor-pointer">
                                <div className="flex flex-col items-center justify-center bg-slate-950 w-16 h-16 rounded-lg border border-slate-800 mr-4 shrink-0">
                                    <span className="text-xs text-slate-500 font-bold uppercase">{new Date(job.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                                    <span className="text-xl font-black text-white">{new Date(job.date).getDate()}</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{job.title}</h4>
                                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                        <Clock className="w-3 h-3"/> {job.timeSlot} • {job.address}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-transform group-hover:translate-x-1" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
      )}
    </div>
  );
}
