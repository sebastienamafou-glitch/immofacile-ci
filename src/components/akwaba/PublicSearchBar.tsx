"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar"; // Assurez-vous d'avoir Shadcn Calendar
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function PublicSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [location, setLocation] = useState(searchParams.get("city") || "");
  const [date, setDate] = useState<Date | undefined>();
  const [guests, setGuests] = useState(searchParams.get("guests") || "1");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set("city", location);
    if (guests) params.set("guests", guests);
    // Pour la date, on pourrait gérer start/end, ici on simplifie
    
    router.push(`/akwaba?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-full shadow-2xl p-2 flex flex-col md:flex-row items-center gap-2 max-w-4xl mx-auto border border-slate-100 animate-in slide-in-from-bottom-6 duration-700">
      
      {/* DESTINATION */}
      <div className="flex-1 px-6 py-2 border-b md:border-b-0 md:border-r border-slate-100 w-full md:w-auto">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">Destination</label>
        <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" />
            <Input 
                placeholder="Où allez-vous ?" 
                className="border-none shadow-none p-0 h-auto focus-visible:ring-0 font-medium placeholder:text-slate-400"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
            />
        </div>
      </div>

      {/* DATES (Simplifié) */}
      <div className="flex-1 px-6 py-2 border-b md:border-b-0 md:border-r border-slate-100 w-full md:w-auto">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">Arrivée</label>
        <Popover>
            <PopoverTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded p-1 -ml-1 transition">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <span className={`text-sm font-medium ${!date ? 'text-slate-400' : 'text-slate-900'}`}>
                        {date ? format(date, "d MMM yyyy", { locale: fr }) : "Ajouter une date"}
                    </span>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                />
            </PopoverContent>
        </Popover>
      </div>

      {/* VOYAGEURS */}
      <div className="w-full md:w-48 px-6 py-2">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">Voyageurs</label>
        <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500" />
            <Input 
                type="number" 
                min={1}
                className="border-none shadow-none p-0 h-auto focus-visible:ring-0 font-medium w-full"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
            />
        </div>
      </div>

      {/* BOUTON SEARCH */}
      <Button 
        size="lg" 
        onClick={handleSearch}
        className="rounded-full w-full md:w-auto px-8 h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-500/30"
      >
        <Search className="w-5 h-5 md:mr-2" />
        <span className="hidden md:inline">Rechercher</span>
      </Button>
    </div>
  );
}
