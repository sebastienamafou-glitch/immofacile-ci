"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BookingWidgetProps {
  listingId: string;
  pricePerNight: number;
}

export default function BookingWidget({ listingId, pricePerNight }: BookingWidgetProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [nights, setNights] = useState<number>(0);

  // Calcul automatique du nombre de nuits et du prix
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        setNights(diffDays);
      } else {
        setNights(0);
      }
    } else {
      setNights(0);
    }
  }, [startDate, endDate]);

  const totalPrice = nights * pricePerNight;

  const handleBooking = () => {
    if (!startDate || !endDate) {
      toast.error("Veuillez sélectionner vos dates d'arrivée et de départ.");
      return;
    }
    if (nights <= 0) {
      toast.error("La date de départ doit être ultérieure à la date d'arrivée.");
      return;
    }

    // Redirection vers une future page de checkout (on passe les infos dans l'URL pour simplifier)
    const checkoutUrl = `/checkout?listingId=${listingId}&start=${startDate}&end=${endDate}&price=${totalPrice}`;
    router.push(checkoutUrl);
  };

  // On bloque les dates passées
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="sticky top-28 bg-white border border-slate-200 p-6 rounded-3xl shadow-xl space-y-6">
      <div className="flex items-end gap-2">
        <span className="text-3xl font-black text-slate-900">{pricePerNight.toLocaleString()} F</span>
        <span className="text-slate-500 mb-1 font-medium">/ nuit</span>
      </div>

      <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col">
        <div className="flex w-full border-b border-slate-300">
          <div className="flex-1 p-3 border-r border-slate-300 relative">
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Arrivée</p>
            <Input 
                type="date" 
                min={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-0 p-0 h-auto font-medium text-slate-900 focus-visible:ring-0 shadow-none bg-transparent"
            />
          </div>
          <div className="flex-1 p-3 relative">
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Départ</p>
            <Input 
                type="date" 
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-0 p-0 h-auto font-medium text-slate-900 focus-visible:ring-0 shadow-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {nights > 0 && (
        <div className="space-y-3 pb-4 border-b border-slate-200">
          <div className="flex justify-between text-slate-600">
            <span>{pricePerNight.toLocaleString()} F x {nights} nuits</span>
            <span>{totalPrice.toLocaleString()} F</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Frais de service Immofacile</span>
            <span>0 F</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center font-black text-lg text-slate-900">
        <span>Total</span>
        <span>{totalPrice > 0 ? totalPrice.toLocaleString() : "0"} F</span>
      </div>

      <Button 
        onClick={handleBooking}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white h-14 rounded-xl text-lg font-bold shadow-lg shadow-orange-600/20"
      >
        Réserver
      </Button>

      <p className="text-center text-slate-500 text-sm font-medium">
        Aucun montant ne vous sera débité pour le moment.
      </p>
    </div>
  );
}
