"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Minus, Plus, ShieldCheck, Star } from "lucide-react";
import { format, differenceInCalendarDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface BookingWidgetProps {
  listingId: string;
  pricePerNight: number;
  maxGuests: number;
  serviceFeePercentage?: number;
}

export default function BookingWidget({
  listingId,
  pricePerNight,
  maxGuests,
  serviceFeePercentage = 0.12,
}: BookingWidgetProps) {
  const router = useRouter();
  const { data: session } = useSession();
  
  // État local pour la date
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false); // Contrôle manuel du Popover

  // Calculs automatiques
  const { nights, subTotal, serviceFee, total, canBook } = useMemo(() => {
    // Il faut impérativement une date de début ET une date de fin
    if (!dateRange?.from || !dateRange?.to) {
      return { nights: 0, subTotal: 0, serviceFee: 0, total: 0, canBook: false };
    }

    const dayCount = differenceInCalendarDays(dateRange.to, dateRange.from);
    
    // Si on clique 2 fois sur le même jour (0 nuit), on considère que c'est invalide
    if (dayCount < 1) {
        return { nights: 0, subTotal: 0, serviceFee: 0, total: 0, canBook: false };
    }

    const sub = dayCount * pricePerNight;
    const fee = Math.round(sub * serviceFeePercentage);
    
    return {
      nights: dayCount,
      subTotal: sub,
      serviceFee: fee,
      total: sub + fee,
      canBook: true
    };
  }, [dateRange, pricePerNight, serviceFeePercentage]);

  // Petit effet pour fermer le calendrier quand la sélection est complète
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
        // On attend un tout petit peu pour que l'utilisateur voie sa sélection
        const t = setTimeout(() => setIsPopoverOpen(false), 500);
        return () => clearTimeout(t);
    }
  }, [dateRange]);

  const handleReserve = async () => {
    if (!session) {
      toast.error("Connectez-vous pour réserver");
      router.push(`/login?callbackUrl=/akwaba/listings/${listingId}`);
      return;
    }

    if (!canBook || !dateRange?.from || !dateRange?.to) {
        setIsPopoverOpen(true); // Ouvre le calendrier si on clique alors que c'est pas prêt
        return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/akwaba/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          startDate: dateRange.from,
          endDate: dateRange.to,
          guestCount: guests,
          totalPrice: total
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la réservation");

      toast.success("Demande envoyée ! 🚀");
      // router.push(`/akwaba/checkout/${data.bookingId}`);

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sticky top-24 bg-white text-slate-900 rounded-2xl p-6 shadow-2xl shadow-black/20 border border-slate-200">
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <span className="text-2xl font-black text-slate-900">
            {pricePerNight.toLocaleString("fr-FR")} FCFA
          </span>
          <span className="text-slate-500 font-medium"> / nuit</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
          <Star className="w-3 h-3 fill-orange-500 text-orange-500" /> 4.92
        </div>
      </div>

      <div className="border border-slate-300 rounded-xl overflow-hidden mb-4">
        
        {/* POPOVER CALENDRIER */}
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="grid grid-cols-2 border-b border-slate-300 cursor-pointer hover:bg-slate-50 transition group">
              <div className="p-3 border-r border-slate-300 relative">
                <div className="text-[10px] font-bold uppercase text-slate-500">Arrivée</div>
                <div className={cn("text-sm font-medium truncate", !dateRange?.from && "text-slate-400")}>
                  {dateRange?.from ? format(dateRange.from, "dd MMM yyyy", { locale: fr }) : "Ajouter date"}
                </div>
              </div>
              <div className="p-3 relative">
                <div className="text-[10px] font-bold uppercase text-slate-500">Départ</div>
                <div className={cn("text-sm font-medium truncate", !dateRange?.to && "text-slate-400")}>
                  {dateRange?.to ? format(dateRange.to, "dd MMM yyyy", { locale: fr }) : "Ajouter date"}
                </div>
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white" align="end" sideOffset={10}>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from || new Date()}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              disabled={(date) => date < addDays(new Date(), -1)}
              className="p-3 border-0"
            />
          </PopoverContent>
        </Popover>

        {/* VOYAGEURS */}
        <div className="p-3 flex justify-between items-center hover:bg-slate-50">
            <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Voyageurs</div>
                <div className="text-sm font-medium">{guests} voyageur{guests > 1 ? 's' : ''}</div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    disabled={guests <= 1}
                    className="p-1 rounded-full border border-slate-300 hover:border-slate-900 disabled:opacity-50 transition"
                >
                    <Minus className="w-4 h-4"/>
                </button>
                 <button 
                    onClick={() => setGuests(Math.min(maxGuests, guests + 1))}
                    disabled={guests >= maxGuests}
                    className="p-1 rounded-full border border-slate-300 hover:border-slate-900 disabled:opacity-50 transition"
                >
                    <Plus className="w-4 h-4"/>
                </button>
            </div>
        </div>
      </div>

      {/* BOUTON D'ACTION PRINCIPAL */}
      <Button
        onClick={handleReserve}
        disabled={loading} // On ne désactive plus si "canBook" est faux, on laisse cliquer pour ouvrir le calendrier
        className={cn(
            "w-full h-12 text-white font-bold text-lg shadow-lg mb-4 transition-all active:scale-[0.98]",
            canBook 
                ? "bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-700 hover:to-rose-700" 
                : "bg-slate-900 hover:bg-slate-800" // Style différent si pas prêt
        )}
      >
        {loading ? <Loader2 className="animate-spin" /> : (canBook ? "Réserver" : "Vérifier la disponibilité")}
      </Button>

      {/* DÉTAILS PRIX */}
      {canBook && (
        <div className="space-y-3 text-sm text-slate-600 animate-in fade-in slide-in-from-top-2">
            <p className="text-center text-xs text-slate-500 mb-4">Aucun montant ne sera débité pour le moment</p>
          <div className="flex justify-between">
            <span className="underline">
              {pricePerNight.toLocaleString()} FCFA x {nights} nuits
            </span>
            <span>{subTotal.toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between">
            <span className="underline cursor-help">Frais de service Akwaba</span>
            <span>{serviceFee.toLocaleString()} FCFA</span>
          </div>
          <Separator className="bg-slate-300 my-4" />
          <div className="flex justify-between font-black text-slate-900 text-lg">
            <span>Total (HT)</span>
            <span>{total.toLocaleString()} FCFA</span>
          </div>
        </div>
      )}
      
       <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Paiement 100% Sécurisé par CinetPay
        </div>
    </div>
  );
}
