"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { differenceInCalendarDays, eachDayOfInterval, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Star, User, Wifi, Car, Utensils, Tv, CheckCircle2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar"; // Vérifiez que vous avez installé le calendar shadcn
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateRange } from "react-day-picker";

interface ListingClientProps {
  listing: any; // Idéalement, utilisez le type complet de Prisma
  bookedDates: { startDate: Date; endDate: Date }[];
}

export default function ListingClient({ listing, bookedDates }: ListingClientProps) {
  const router = useRouter();
  
  // État du calendrier
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // 1. CALCUL DES DATES INDISPONIBLES (Tableau de dates précises)
  const disabledDates = useMemo(() => {
    let dates: Date[] = [];
    bookedDates.forEach((booking) => {
      const range = eachDayOfInterval({
        start: new Date(booking.startDate),
        end: new Date(booking.endDate),
      });
      dates = [...dates, ...range];
    });
    return dates;
  }, [bookedDates]);

  // 2. Logique de Prix
  const nights = dateRange?.from && dateRange?.to 
    ? differenceInCalendarDays(dateRange.to, dateRange.from) 
    : 0;
  
  const totalPrice = nights * listing.pricePerNight;

  const handleReserve = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const start = dateRange.from.toISOString();
    const end = dateRange.to.toISOString();
    
    // Redirection vers le checkout avec les dates
    router.push(`/checkout/${listing.id}?start=${start}&end=${end}&guests=1`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in">
      
      {/* --- HEADER --- */}
      <h1 className="text-3xl font-black text-slate-900 mb-2">{listing.title}</h1>
      <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
        <span className="flex items-center gap-1 font-bold text-slate-900">
           <Star className="w-4 h-4 fill-orange-500 text-orange-500" /> 4.92
        </span>
        <span>•</span>
        <span className="underline decoration-dotted cursor-pointer">3 avis</span>
        <span>•</span>
        <span className="flex items-center gap-1 text-slate-700">
           <MapPin className="w-4 h-4" /> {listing.city}
        </span>
      </div>

      {/* --- GALERIE PHOTO (Grid bento) --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-3 h-[400px] md:h-[500px] rounded-2xl overflow-hidden mb-12">
        {listing.images.slice(0, 5).map((img: string, i: number) => (
            <div key={i} className={`relative bg-slate-200 ${i === 0 ? "md:col-span-2 md:row-span-2" : "col-span-1 row-span-1"}`}>
                <Image src={img} alt="Vue" fill className="object-cover hover:scale-105 transition-transform duration-700" />
            </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        
        {/* --- COLONNE GAUCHE (Infos) --- */}
        <div className="md:col-span-2 space-y-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-8">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Logement entier : hébergé par {listing.host.name}</h2>
                    <p className="text-slate-500">4 voyageurs • 2 chambres • 2 lits • 2 salles de bain</p>
                </div>
                <Avatar className="w-14 h-14 border border-slate-100">
                    <AvatarImage src={listing.host.image} />
                    <AvatarFallback>{listing.host.name?.[0]}</AvatarFallback>
                </Avatar>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-slate-900">À propos de ce logement</h3>
                <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                    {listing.description.slice(0, 300)}...
                </p>
                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="flex items-center gap-3 text-slate-700"><Wifi className="w-5 h-5 text-slate-400"/> Wifi Haut débit</div>
                    <div className="flex items-center gap-3 text-slate-700"><Car className="w-5 h-5 text-slate-400"/> Parking gratuit</div>
                    <div className="flex items-center gap-3 text-slate-700"><Utensils className="w-5 h-5 text-slate-400"/> Cuisine équipée</div>
                    <div className="flex items-center gap-3 text-slate-700"><Tv className="w-5 h-5 text-slate-400"/> TV 4K + Netflix</div>
                </div>
            </div>
        </div>

        {/* --- COLONNE DROITE (Calendrier Sticky) --- */}
        <div className="relative">
            <Card className="sticky top-24 shadow-xl border-slate-200 overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <span className="text-2xl font-black text-slate-900">{listing.pricePerNight.toLocaleString()} F</span>
                            <span className="text-slate-500 text-sm"> / nuit</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-slate-900" /> 4.92
                        </div>
                    </div>

                    {/* CALENDRIER INTERACTIF */}
                    <div className="border rounded-xl p-3 mb-4 bg-white">
                        <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            locale={fr}
                            // 🛑 C'EST ICI QU'ON BLOQUE LES DATES
                            disabled={[
                                { before: new Date() }, // Pas de passé
                                ...disabledDates        // Pas de dates déjà réservées
                            ]}
                            className="rounded-md border-0 w-full"
                        />
                    </div>

                    <Button 
                        onClick={handleReserve}
                        disabled={!dateRange?.from || !dateRange?.to}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-lg h-12 font-bold mb-4"
                    >
                        Réserver
                    </Button>

                    {nights > 0 && (
                        <div className="space-y-3 text-sm text-slate-600 animate-in slide-in-from-top-2">
                            <div className="flex justify-between">
                                <span className="underline">{listing.pricePerNight.toLocaleString()} F x {nights} nuits</span>
                                <span>{(listing.pricePerNight * nights).toLocaleString()} F</span>
                            </div>
                            <div className="flex justify-between text-orange-600 font-medium">
                                <span>Frais de service</span>
                                <span>-10% (Offert)</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-slate-900 text-base">
                                <span>Total</span>
                                <span>{totalPrice.toLocaleString()} F</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}
