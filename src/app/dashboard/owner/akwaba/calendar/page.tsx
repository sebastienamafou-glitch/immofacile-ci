"use client";

import { useState, useEffect } from "react";
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval 
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CalendarEvent {
  id: string;
  title: string;
  subtitle: string;
  start: string;
  end: string;
  type: 'BLOCK' | 'BOOKING';
  color: string;
}

export default function MasterCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. CHARGEMENT DES DONNÉES
  const fetchEvents = async (date: Date) => {
    setLoading(true);
    try {
      // On passe la date pour optimiser la requête côté serveur
      const dateString = format(date, 'yyyy-MM-dd');
      const res = await fetch(`/api/owner/akwaba/calendar?date=${dateString}`, {
          headers: {
              // Récupération auth safe
              'x-user-email': JSON.parse(localStorage.getItem("immouser") || "{}").email || ""
          }
      });
      const data = await res.json();
      if (data.success) setEvents(data.events);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(currentDate);
  }, [currentDate]);

  // 2. CONSTRUCTION DE LA GRILLE
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: fr });
  const endDate = endOfWeek(monthEnd, { locale: fr });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // 3. NAVIGATION
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="max-w-6xl mx-auto p-6 pb-24 h-screen flex flex-col">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-2">
                    <CalIcon className="text-orange-500" /> Planning
                </h1>
                <p className="text-slate-400">Vue d'ensemble des disponibilités.</p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-900 p-2 rounded-xl border border-white/10">
                <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-white transition">
                    <ChevronLeft size={20} />
                </button>
                <span className="text-white font-bold w-32 text-center select-none">
                    {format(currentDate, 'MMMM yyyy', { locale: fr })}
                </span>
                <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-white transition">
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>

        {/* CALENDRIER */}
        <div className="flex-1 bg-slate-900 border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            
            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 bg-slate-950 border-b border-white/5">
                {weekDays.map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grille des jours */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {calendarDays.map((day, idx) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());
                    
                    // Trouver les événements pour ce jour
                    const dayEvents = events.filter(evt => 
                        isWithinInterval(day, { 
                            start: new Date(evt.start), 
                            end: new Date(evt.end) 
                        })
                    );

                    return (
                        <div 
                            key={day.toISOString()} 
                            className={`
                                min-h-[100px] border-r border-b border-white/5 p-2 relative transition group hover:bg-white/[0.02]
                                ${!isCurrentMonth ? 'bg-slate-950/50 text-slate-700' : 'text-slate-300'}
                            `}
                        >
                            {/* Numéro du jour */}
                            <span className={`
                                text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1
                                ${isToday ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/50' : ''}
                            `}>
                                {format(day, 'd')}
                            </span>

                            {/* Liste des événements (max 3 affichés pour éviter l'overflow) */}
                            <div className="space-y-1 mt-1">
                                {loading ? (
                                    idx === 0 && <Loader2 className="animate-spin w-4 h-4 text-orange-500 mx-auto mt-4" />
                                ) : (
                                    dayEvents.slice(0, 3).map((evt) => (
                                        <div 
                                            key={evt.id} 
                                            className={`
                                                text-[10px] px-2 py-1 rounded truncate font-medium border-l-2 cursor-pointer hover:brightness-110 transition
                                                ${evt.type === 'BLOCK' 
                                                    ? 'bg-red-500/10 text-red-400 border-red-500' 
                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500'
                                                }
                                            `}
                                            title={`${evt.title} - ${evt.subtitle}`}
                                        >
                                            {evt.title}
                                        </div>
                                    ))
                                )}
                                {dayEvents.length > 3 && (
                                    <div className="text-[9px] text-slate-500 pl-1">
                                        + {dayEvents.length - 3} autres
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* LÉGENDE */}
        <div className="mt-4 flex gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500"></div>
                <span>Réservation confirmée</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500"></div>
                <span>Bloqué / Maintenance</span>
            </div>
        </div>

    </div>
  );
}
