"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { addDays, differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";

interface BookingSidebarProps {
  listingId: string;
  pricePerNight: number;
  bookings: { startDate: Date; endDate: Date }[]; // Dates indisponibles
}

export default function BookingSidebar({ listingId, pricePerNight, bookings }: BookingSidebarProps) {
  const router = useRouter();
  const [date, setDate] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(false);

  // 1. CALCULS FINANCIERS EN TEMPS RÉEL
  const { nights, total, serviceFee } = useMemo(() => {
    if (!date?.from || !date?.to) return { nights: 0, total: 0, serviceFee: 0 };
    
    const dayCount = differenceInDays(date.to, date.from);
    if (dayCount <= 0) return { nights: 0, total: 0, serviceFee: 0 };

    const subTotal = dayCount * pricePerNight;
    const fee = Math.round(subTotal * 0.10); // 10% frais de service (Exemple Business Model)
    
    return { 
        nights: dayCount, 
        serviceFee: fee,
        total: subTotal + fee 
    };
  }, [date, pricePerNight]);

  // 2. GESTION DES DATES INDISPONIBLES
  const isDateDisabled = (date: Date) => {
    // Bloquer le passé
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    
    // Bloquer les réservations existantes
    return bookings.some(b => 
        date >= new Date(b.startDate) && date <= new Date(b.endDate)
    );
  };

  // 3. ACTION DE RÉSERVATION
  const handleReserve = () => {
    if (!date?.from || !date?.to) return toast.error("Sélectionnez vos dates.");
    setLoading(true);

    // Simulation de redirection vers Checkout (Prochaine étape logique)
    // Ici on passerait les dates en query params vers une page de paiement
    const params = new URLSearchParams({
        start: date.from.toISOString(),
        end: date.to.toISOString(),
        guests: "1" // À dynamiser
    });

    toast.success("Redirection vers le paiement sécurisé...");
    router.push(`/checkout/${listingId}?${params.toString()}`);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-6 shadow-xl sticky top-24 bg-white">
      <div className="flex justify-between items-baseline mb-6">
        <span className="text-2xl font-black text-slate-900">{pricePerNight.toLocaleString()} F</span>
        <span className="text-slate-500 text-sm">par nuit</span>
      </div>

      {/* SÉLECTEUR DE DATES */}
      <div className="grid gap-2 mb-4">
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-12 border-slate-300">
                    <CalendarIcon className="mr-2 h-4 w-4 text-orange-500" />
                    {date?.from ? (
                        date.to ? (
                            <>{format(date.from, "d MMM", { locale: fr })} - {format(date.to, "d MMM", { locale: fr })}</>
                        ) : (
                            format(date.from, "d MMM", { locale: fr })
                        )
                    ) : (
                        <span>Date d'arrivée - départ</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    disabled={isDateDisabled}
                    locale={fr}
                />
            </PopoverContent>
        </Popover>
      </div>

      <Button 
        onClick={handleReserve} 
        disabled={!date?.from || !date?.to || loading}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 text-lg mb-4"
      >
        {loading ? <Loader2 className="animate-spin" /> : "Réserver"}
      </Button>

      <div className="text-center text-xs text-slate-400 mb-6">
        Aucun montant débité pour le moment
      </div>

      {/* DÉTAIL DU PRIX */}
      {nights > 0 && (
          <div className="space-y-3 text-sm text-slate-600 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between">
                <span className="underline">{pricePerNight.toLocaleString()} x {nights} nuits</span>
                <span>{(pricePerNight * nights).toLocaleString()} F</span>
            </div>
            <div className="flex justify-between">
                <span className="underline">Frais de service Akwaba</span>
                <span>{serviceFee.toLocaleString()} F</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2">
                <span>Total (FCFA)</span>
                <span>{total.toLocaleString()} F</span>
            </div>
          </div>
      )}
    </div>
  );
}
