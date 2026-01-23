"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { 
  MapPin, Star, Wifi, Car, Tv, Utensils, Calendar as CalendarIcon, 
  CheckCircle2, ArrowLeft, Loader2, Share2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DateRange } from "react-day-picker"; // Assurez-vous d'avoir installé date-fns et react-day-picker
import { addDays, differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar"; // Composant Shadcn UI
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  
  // --- ÉTATS ---
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Gestion Dates & Prix
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 3),
  });

  // --- 1. CHARGEMENT INITIAL ---
  useEffect(() => {
    // A. Récupération User (LocalStorage)
    const storedUser = localStorage.getItem("immouser");
    if (storedUser) {
        setUser(JSON.parse(storedUser));
    }

    // B. Récupération Annonce
    const fetchListing = async () => {
        try {
            // On utilise l'API publique (pas besoin de token)
            // Si cette route n'existe pas, créez src/app/api/public/listings/[id]/route.ts
            // Ou utilisez directement Prisma ici si c'était un Server Component (mais on est en "use client" pour l'interactivité)
            const res = await api.get(`/public/listings/${id}`); // Assurez-vous que cette route existe !
            setListing(res.data);
        } catch (error) {
            console.error("Erreur chargement", error);
        } finally {
            setLoading(false);
        }
    };

    if (id) fetchListing();
  }, [id]);

  // --- 2. CALCUL PRIX TOTAL ---
  const nights = date?.from && date?.to ? differenceInDays(date.to, date.from) : 0;
  const totalPrice = listing ? listing.pricePerNight * nights : 0;
  const serviceFee = Math.round(totalPrice * 0.10); // 10% frais
  const totalPayable = totalPrice + serviceFee;

  // --- 3. ACTION RÉSERVER ---
  const handleReserve = async () => {
    // A. Vérification Connexion
    if (!user) {
        toast.error("Vous devez être connecté pour réserver.");
        // Sauvegarde de l'URL pour revenir après login
        localStorage.setItem("redirectAfterLogin", `/akwaba/${id}`);
        router.push("/login");
        return;
    }

    // B. Validation Dates
    if (!date?.from || !date?.to || nights < 1) {
        toast.error("Veuillez sélectionner des dates valides (min 1 nuit).");
        return;
    }

    setBookingLoading(true);
    try {
        // C. Appel API Réservation
        // Assurez-vous que votre fichier route.ts (Booking) est bien dans /api/guest/booking/route.ts
        const res = await fetch("/api/guest/booking", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                listingId: listing.id,
                startDate: date.from,
                endDate: date.to,
                totalPrice: totalPayable,
                userEmail: user.email // On envoie l'email pour identifier le user côté serveur
            })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Erreur réservation");

        // D. Succès
        toast.success("Réservation confirmée ! 🎉");
        router.push("/dashboard/guest"); // Redirection vers l'historique

    } catch (error: any) {
        toast.error(error.message);
    } finally {
        setBookingLoading(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0B1120] text-white"><Loader2 className="animate-spin w-10 h-10 text-orange-500"/></div>;
  if (!listing) return <div className="h-screen flex items-center justify-center bg-[#0B1120] text-white">Annonce introuvable.</div>;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans pb-20">
      
      {/* NAVBAR SIMPLE */}
      <nav className="fixed top-0 w-full z-50 bg-[#0B1120]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition font-bold text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour aux annonces
        </button>
        <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white"><Share2 className="w-5 h-5"/></Button>
        </div>
      </nav>

      {/* PHOTOS GRID */}
      <div className="pt-20 pb-8 px-4 max-w-7xl mx-auto">
         <div className="grid grid-cols-4 gap-2 h-[400px] rounded-3xl overflow-hidden">
            <div className="col-span-2 relative bg-slate-800">
                {listing.images?.[0] && <Image src={listing.images[0]} alt="Main" fill className="object-cover" />}
            </div>
            <div className="col-span-1 grid grid-rows-2 gap-2">
                <div className="relative bg-slate-800">{listing.images?.[1] && <Image src={listing.images[1]} alt="1" fill className="object-cover" />}</div>
                <div className="relative bg-slate-800">{listing.images?.[2] && <Image src={listing.images[2]} alt="2" fill className="object-cover" />}</div>
            </div>
            <div className="col-span-1 relative bg-slate-800">
                {listing.images?.[3] && <Image src={listing.images[3]} alt="3" fill className="object-cover" />}
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-3 gap-12">
        
        {/* GAUCHE : INFOS */}
        <div className="lg:col-span-2 space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{listing.title}</h1>
                    <p className="text-slate-400 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-500" /> {listing.city}, {listing.neighborhood}
                    </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                     <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-lg">
                        {(listing.host?.name || "H").charAt(0)}
                     </div>
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
            </div>

            <div className="h-px bg-white/10 w-full" />

            <div>
                <h3 className="text-xl font-bold text-white mb-4">À propos de ce logement</h3>
                <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {listing.description}
                </p>
            </div>

            <div>
                <h3 className="text-xl font-bold text-white mb-4">Ce que propose ce logement</h3>
                <div className="grid grid-cols-2 gap-4">
                    {/* Fake amenities pour l'exemple si pas en base */}
                    <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-xl border border-white/5">
                        <Wifi className="w-5 h-5 text-orange-500" /> <span className="text-sm">Connexion Wifi HD</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-xl border border-white/5">
                        <Car className="w-5 h-5 text-orange-500" /> <span className="text-sm">Parking gratuit</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-xl border border-white/5">
                        <Tv className="w-5 h-5 text-orange-500" /> <span className="text-sm">TV 4K & Netflix</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-xl border border-white/5">
                        <Utensils className="w-5 h-5 text-orange-500" /> <span className="text-sm">Cuisine équipée</span>
                    </div>
                </div>
            </div>
        </div>

        {/* DROITE : CARTE RÉSERVATION */}
        <div className="relative">
            <div className="sticky top-24 bg-[#0F172A] border border-white/10 rounded-3xl p-6 shadow-2xl">
                
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <span className="text-3xl font-black text-white">{listing.pricePerNight.toLocaleString()}</span>
                        <span className="text-sm font-bold text-orange-500 ml-1">FCFA</span>
                        <span className="text-xs text-slate-500 block mt-1">par nuit</span>
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20 flex gap-2">
                        <CheckCircle2 className="w-3 h-3"/> Garantie Akwaba
                    </div>
                </div>

                {/* SÉLECTEUR DE DATES */}
                <div className="mb-6 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Dates du séjour</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={`w-full justify-start text-left font-normal bg-slate-900 border-slate-700 text-white hover:bg-slate-800 hover:text-white h-12 ${!date && "text-muted-foreground"}`}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-orange-500" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                        {format(date.from, "dd MMM", { locale: fr })} -{" "}
                                        {format(date.to, "dd MMM yyyy", { locale: fr })}
                                        </>
                                    ) : (
                                        format(date.from, "dd MMM yyyy", { locale: fr })
                                    )
                                ) : (
                                    <span>Choisir les dates</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800 text-white" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                                disabled={(date) => date < new Date()}
                                className="bg-slate-950 text-white border-none rounded-xl"
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* RÉSUMÉ PRIX */}
                {nights > 0 && (
                    <div className="space-y-3 mb-6 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>{listing.pricePerNight.toLocaleString()} x {nights} nuits</span>
                            <span>{totalPrice.toLocaleString()} F</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>Frais de service (10%)</span>
                            <span>{serviceFee.toLocaleString()} F</span>
                        </div>
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex justify-between text-base font-bold text-white">
                            <span>Total</span>
                            <span>{totalPayable.toLocaleString()} FCFA</span>
                        </div>
                    </div>
                )}

                {/* BOUTON ACTION */}
                <Button 
                    onClick={handleReserve} 
                    disabled={bookingLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold h-14 text-lg rounded-xl transition shadow-lg shadow-orange-500/20"
                >
                    {bookingLoading ? <Loader2 className="animate-spin w-5 h-5"/> : "Réserver maintenant"}
                </Button>

                <p className="text-center text-[10px] text-slate-500 mt-4 flex items-center justify-center gap-1">
                     <CheckCircle2 className="w-3 h-3"/> Paiement sécurisé • Aucun débit immédiat
                </p>

            </div>
        </div>

      </div>
    </div>
  );
}
