"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PublicSearchBarProps {
  availableCities: string[];
}

export default function PublicSearchBar({ availableCities }: PublicSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [location, setLocation] = useState(searchParams.get("city") || "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [guests, setGuests] = useState(searchParams.get("guests") || "1");
  const suggestionRef = useRef<HTMLDivElement>(null);

  // AUTO-COMPLÉTION
  useEffect(() => {
    if (location.length > 1) {
      const filtered = availableCities.filter(city => 
        city.toLowerCase().includes(location.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [location, availableCities]);

  // FERMETURE AU CLIC EXTÉRIEUR
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Dans src/components/akwaba/PublicSearchBar.tsx
const handleSearch = () => {
  const params = new URLSearchParams();
  if (location) params.set("city", location);
  if (guests) params.set("guests", guests);
  
  // ✅ DOIT POINTER VERS /akwaba/listings
  router.push(`/akwaba/listings?${params.toString()}`);
};

  return (
    <div className="w-full max-w-5xl mx-auto bg-[#1E293B]/60 backdrop-blur-2xl border border-white/10 p-2 md:p-3 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center gap-2 relative transition-all duration-500 hover:border-orange-500/30">
      
      {/* 📍 DESTINATION */}
      <div className="flex-[1.5] w-full px-6 py-2 border-b md:border-b-0 md:border-r border-white/5 relative">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Destination</label>
        <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
            <input 
                placeholder="Où allez-vous ?" 
                className="bg-transparent border-none outline-none text-white font-bold placeholder:text-slate-600 w-full text-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onFocus={() => location.length > 1 && setShowSuggestions(true)}
            />
        </div>

        {/* LISTE SUGGESTIONS */}
        {showSuggestions && suggestions.length > 0 && (
          <div ref={suggestionRef} className="absolute top-full left-0 w-full mt-4 bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-in fade-in zoom-in duration-200">
            {suggestions.map((city) => (
              <button
                key={city}
                onClick={() => {
                  setLocation(city);
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-6 py-3 text-sm text-slate-300 hover:bg-orange-600 hover:text-white transition-colors flex items-center gap-3 font-bold"
              >
                <MapPin size={14} className="text-orange-500" />
                {city}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 📅 DATES */}
      <div className="flex-1 w-full px-6 py-2 border-b md:border-b-0 md:border-r border-white/5 transition-colors hover:bg-white/5 rounded-3xl">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Arrivée</label>
        <Popover>
            <PopoverTrigger asChild>
                <button className="flex items-center gap-2 w-full text-left">
                    <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className={cn(
                        "text-sm font-bold transition-colors",
                        !date ? 'text-slate-600' : 'text-white'
                    )}>
                        {date ? format(date, "d MMM yyyy", { locale: fr }) : "Ajouter une date"}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#0B1120] border-white/10 shadow-2xl" align="start">
                <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className="bg-[#0B1120] text-white rounded-xl"
                />
            </PopoverContent>
        </Popover>
      </div>

      {/* 👥 VOYAGEURS */}
      <div className="flex-1 w-full px-6 py-2 transition-colors hover:bg-white/5 rounded-3xl">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Voyageurs</label>
        <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500 shrink-0" />
            <input 
                type="number" 
                min={1}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
            />
        </div>
      </div>

      <Button 
        onClick={handleSearch}
        className="w-full md:w-auto h-14 md:h-16 rounded-full px-10 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-900/40 active:scale-95 transition-all"
      >
        <Search className="w-5 h-5 md:mr-3" />
        <span className="md:inline">Rechercher</span>
      </Button>
    </div>
  );
}
