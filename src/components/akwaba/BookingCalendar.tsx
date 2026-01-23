"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"; // Assurez-vous d'avoir Shadcn UI Dialog
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Booking = {
  id: string;
  startDate: Date;
  endDate: Date;
  status: string;
  guestName: string;
  isBlock: boolean;
};

interface BookingCalendarProps {
  listingId: string;
  bookings: Booking[];
  pricePerNight: number;
}

export default function BookingCalendar({ listingId, bookings, pricePerNight }: BookingCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // États pour le blocage
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [loading, setLoading] = useState(false);

  // Utilitaires dates
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); 
  const startOffset = getFirstDayOfMonth(currentDate) === 0 ? 6 : getFirstDayOfMonth(currentDate) - 1; 

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const getBookingForDay = (day: number) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0, 0);
    return bookings.find(b => {
      const start = new Date(b.startDate); start.setHours(0,0,0,0);
      const end = new Date(b.endDate); end.setHours(23,59,59,999);
      return targetDate >= start && targetDate <= end;
    });
  };

  // --- ACTION DE BLOCAGE ---
  const handleBlockDates = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/owner/akwaba/block', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listingId, startDate: blockStart, endDate: blockEnd })
        });

        if (res.ok) {
            toast.success("Période bloquée avec succès !");
            setIsBlockOpen(false);
            setBlockStart("");
            setBlockEnd("");
            router.refresh(); // Rafraîchit les données du serveur sans recharger la page
        } else {
            const data = await res.json();
            toast.error(data.error || "Impossible de bloquer cette période.");
        }
    } catch (error) {
        toast.error("Erreur technique.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl h-full flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          {monthNames[currentDate.getMonth()]} <span className="text-slate-500">{currentDate.getFullYear()}</span>
        </h3>
        
        <div className="flex gap-4">
            {/* BOUTON BLOQUER */}
            <Dialog open={isBlockOpen} onOpenChange={setIsBlockOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10">
                        <Ban className="w-4 h-4 mr-2" /> Bloquer
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Bloquer une période</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Date de début</Label>
                            <Input type="date" className="bg-black/40 border-slate-700 text-white" value={blockStart} onChange={e => setBlockStart(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Date de fin</Label>
                            <Input type="date" className="bg-black/40 border-slate-700 text-white" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleBlockDates} disabled={loading} className="bg-orange-600 hover:bg-orange-500 text-white">
                            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null} Confirmer le blocage
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* NAVIGATION MOIS */}
            <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} className="border-slate-700 hover:bg-slate-800 text-white h-8 w-8">
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => changeMonth(1)} className="border-slate-700 hover:bg-slate-800 text-white h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
      </div>

      {/* GRILLE */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
            <div key={d} className="text-center text-slate-500 text-xs uppercase font-bold py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 flex-1 content-start">
        {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}

        {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
            const day = i + 1;
            const booking = getBookingForDay(day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth();

            return (
                <div 
                    key={day} 
                    className={cn(
                        "aspect-square rounded-xl border flex flex-col items-center justify-center relative transition-all",
                        booking 
                            ? (booking.isBlock ? "bg-slate-800 border-slate-600 opacity-60" : "bg-orange-900/20 border-orange-500/30") 
                            : "bg-black/20 border-slate-800 hover:border-slate-600",
                        isToday && "ring-2 ring-blue-500"
                    )}
                >
                    <span className={cn("text-sm font-bold", booking ? (booking.isBlock ? "text-slate-400" : "text-orange-400") : "text-slate-300")}>
                        {day}
                    </span>
                    
                    {booking && (
                        <div className="absolute bottom-1 w-full flex justify-center">
                            <div className={cn("w-1.5 h-1.5 rounded-full", booking.isBlock ? "bg-slate-500" : "bg-orange-500")} />
                        </div>
                    )}
                    
                    {!booking && (
                        <span className="text-[10px] text-slate-600 mt-1 select-none">{Math.round(pricePerNight/1000)}k</span>
                    )}
                </div>
            );
        })}
      </div>
      
      {/* LÉGENDE */}
      <div className="mt-auto flex items-center justify-center gap-6 text-xs border-t border-white/5 pt-4 text-slate-500">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-700" /> Disponible</div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /> Réservé</div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-500" /> Bloqué</div>
      </div>
    </div>
  );
}
