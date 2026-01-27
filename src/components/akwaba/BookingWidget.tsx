"use client";

import { useState } from "react";
import { DateRange } from "react-day-picker";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"; 
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";

interface BookingWidgetProps {
  listingId: string;
  pricePerNight: number;
  blockedDates: Date[];
}

export default function BookingWidget({ listingId, pricePerNight, blockedDates }: BookingWidgetProps) {
  const router = useRouter();
  const { data: session, status } = useSession(); 
  
  const [date, setDate] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // --- 1. CALCULS FINANCIERS ---
  const nightCount = date?.from && date?.to ? differenceInDays(date.to, date.from) : 0;
  const subTotal = nightCount * pricePerNight;
  const serviceFee = Math.round(subTotal * 0.10); 
  const total = subTotal + serviceFee;

  // --- 2. LOGIQUE DE REDIRECTION (MODIFIÉE) ---
  const handleReserve = () => {
    if (!date?.from || !date?.to) return;
    setLoading(true);

    // Préparation des paramètres pour le Checkout
    const bookingParams = new URLSearchParams();
    bookingParams.set("listingId", listingId);
    bookingParams.set("from", date.from.toISOString());
    bookingParams.set("to", date.to.toISOString());
    bookingParams.set("guests", "2"); 
    bookingParams.set("total", total.toString());
    
    // L'URL finale de paiement (où on ira après l'inscription)
    const checkoutUrl = `/checkout?${bookingParams.toString()}`;

    // SCÉNARIO A : Pas connecté -> DIRECTION SIGNUP
    if (status === "unauthenticated") {
        Swal.fire({
            icon: 'info',
            title: 'Création de compte requise',
            text: 'Pour sécuriser votre réservation, veuillez créer un compte Akwaba.',
            confirmButtonColor: '#F97316',
            confirmButtonText: 'Créer mon compte', // ✅ Texte adapté
            showCancelButton: true,
            cancelButtonText: 'J\'ai déjà un compte',
            cancelButtonColor: '#334155',
            background: '#020617', 
            color: '#fff',
            customClass: {
              popup: 'border border-slate-700 rounded-2xl'
            }
        }).then((result) => {
             if (result.isConfirmed) {
                // ✅ OPTION 1 : Il clique sur "Créer mon compte" -> Signup
                router.push(`/akwaba/signup?callbackUrl=${encodeURIComponent(checkoutUrl)}`);
             } else if (result.dismiss === Swal.DismissReason.cancel) {
                // ✅ OPTION 2 : Il clique sur "J'ai déjà un compte" -> Login
                router.push(`/login?callbackUrl=${encodeURIComponent(checkoutUrl)}`);
             }
        });
        setLoading(false);
        return;
    }

    // SCÉNARIO B : Déjà connecté -> On va direct au paiement
    router.push(checkoutUrl);
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-2xl sticky top-24 ring-1 ring-white/5">
      
      {/* HEADER PRIX */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col">
          <span className="text-3xl font-black text-white tracking-tight">
            {pricePerNight.toLocaleString('fr-FR')} <span className="text-base font-medium text-orange-500">FCFA</span>
          </span>
          <span className="text-slate-500 text-xs font-medium">par nuit</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-full border border-emerald-500/20">
            <ShieldCheck size={12} />
            Garantie Akwaba
        </div>
      </div>

      {/* SÉLECTEUR DATES */}
      <div className="mb-6 space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Dates du séjour</label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "w-full h-14 justify-start text-left font-medium bg-slate-900 border-slate-700 text-white hover:bg-slate-800 hover:text-white hover:border-orange-500/50 transition-all rounded-xl",
                isCalendarOpen && "border-orange-500 ring-1 ring-orange-500/30"
              )}
            >
              <CalendarIcon className={cn("mr-3 h-5 w-5", isCalendarOpen ? "text-orange-500" : "text-slate-500")} />
              {date?.from ? (
                date.to ? (
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-bold text-white">
                        {format(date.from, "d MMM", { locale: fr })} - {format(date.to, "d MMM", { locale: fr })}
                    </span>
                    <span className="text-[10px] text-slate-400">{nightCount} nuits</span>
                  </span>
                ) : (
                  <span className="text-white font-bold">{format(date.from, "d MMM", { locale: fr })}</span>
                )
              ) : (
                <span className="text-slate-400">Arrivée - Départ</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 bg-[#020617] border-slate-700 text-slate-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] rounded-2xl z-50" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from || new Date()}
              selected={date}
              onSelect={(range) => {
                  setDate(range);
                  if(range?.from && range?.to) setIsCalendarOpen(false);
              }}
              numberOfMonths={1}
              locale={fr}
              disabled={(day) => {
                 const isPast = day < new Date(new Date().setHours(0,0,0,0));
                 const isBlocked = blockedDates.some(d => 
                    d.getDate() === day.getDate() && 
                    d.getMonth() === day.getMonth() && 
                    d.getFullYear() === day.getFullYear()
                 );
                 return isPast || isBlocked;
              }}
              className="text-white"
              classNames={{
                day_selected: "bg-orange-500 text-white hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white",
                day_today: "bg-slate-800 text-white",
                day_outside: "text-slate-600 opacity-50",
                day_disabled: "text-slate-700 opacity-30 line-through decoration-slate-700",
                head_cell: "text-slate-400 font-normal text-[0.8rem]",
                caption: "text-white font-bold capitalize relative flex items-center justify-center pt-1",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* DÉTAILS PRIX */}
      {nightCount > 0 ? (
        <div className="space-y-4 mb-6 bg-slate-950/50 p-4 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between text-slate-300 text-sm">
                <span>{pricePerNight.toLocaleString()} F x {nightCount} nuits</span>
                <span>{subTotal.toLocaleString()} F</span>
            </div>
            <div className="flex justify-between text-slate-300 text-sm">
                <span>Frais de service (10%)</span>
                <span>{serviceFee.toLocaleString()} F</span>
            </div>
            <div className="h-px bg-white/10 my-1"></div>
            <div className="flex justify-between text-white font-black text-lg">
                <span>Total</span>
                <span className="text-orange-400">{total.toLocaleString()} F</span>
            </div>
        </div>
      ) : (
         <div className="mb-6 p-4 rounded-xl bg-slate-800/30 border border-dashed border-slate-700 text-center">
            <p className="text-xs text-slate-500">Sélectionnez vos dates pour voir le total.</p>
        </div>
      )}

      {/* BOUTON D'ACTION */}
      <Button 
        size="lg" 
        className="w-full h-14 text-lg font-bold bg-[#F59E0B] hover:bg-orange-500 text-black shadow-lg shadow-orange-500/20 transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!date?.from || !date?.to || loading}
        onClick={handleReserve}
      >
        {loading ? <Loader2 className="animate-spin mr-2" /> : null}
        {loading ? "Redirection..." : "RÉSERVER MAINTENANT"}
      </Button>
      
      <p className="text-center text-[10px] text-slate-500 mt-4 flex items-center justify-center gap-1">
        <ShieldCheck size={10} /> Paiement sécurisé • Aucun débit immédiat
      </p>
    </div>
  );
}
