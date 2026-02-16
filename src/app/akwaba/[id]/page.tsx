"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { differenceInDays } from "date-fns";
import { toast } from "sonner";
import { contactHost } from "@/actions/messages"; 
import { createBooking } from "@/actions/bookings";
import { toggleWishlist as toggleWishlistAction } from "@/actions/wishlist"; // ✅ Import renommé pour éviter conflit
import { 
  MapPin, User, ShieldCheck, Wifi, Car, Tv, Wind, Coffee, Star,
  Calendar as CalendarIcon, Loader2, CheckCircle2, 
  Share2, Heart, ChevronLeft, ChevronRight, LayoutGrid, MessageSquare, Send, X
} from "lucide-react";

// --- TYPES ---
interface Listing {
  id: string;
  title: string;
  description: string;
  pricePerNight: number;
  address: string;
  city: string;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  host: { name: string; image?: string };
  amenities: any;
  isFavorite?: boolean;
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // --- ÉTATS ---
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  
  // UX States
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Booking States
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // Message States (Contact Host)
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await api.get(`/public/listings/${id}`); 
        if (res.data) {
            setListing(res.data);
            if(res.data.isFavorite) setIsWishlisted(true);
        }
      } catch (error) {
        console.error(error);
        toast.error("Impossible de charger l'annonce");
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  // --- LOGIC ---
  const nights = startDate && endDate ? differenceInDays(new Date(endDate), new Date(startDate)) : 0;
  const totalPrice = listing ? listing.pricePerNight * nights : 0;
  const serviceFee = Math.round(totalPrice * 0.10);
  const totalPayable = totalPrice + serviceFee;

  // --- HANDLERS ---
  
  const setMainImage = (index: number) => setCurrentImageIndex(index);

  const nextImage = () => {
    if(!listing) return;
    setCurrentImageIndex((prev) => (prev === listing.images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    if(!listing) return;
    setCurrentImageIndex((prev) => (prev === 0 ? listing.images.length - 1 : prev - 1));
  };

  const handleReserve = async () => {
    const currentQuery = searchParams.toString();
    const relativeCallbackUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;

    if (!session) {
        router.push(`/akwaba/signup?callbackUrl=${encodeURIComponent(relativeCallbackUrl)}`);
        return;
    }

    if (!startDate || !endDate) {
        toast.error("Veuillez sélectionner vos dates d'arrivée et de départ");
        return;
    }
    
    setBookingLoading(true);
    try {
        const result = await createBooking(listing!.id, startDate, endDate);
        
        if (result.success) {
            toast.success("Demande envoyée !", { description: "Accédez à vos voyages pour le paiement." });
            router.push("/dashboard/guest/trips");
        } else {
            toast.error(result.error || "Erreur réservation");
        }
    } catch (e) {
        toast.error("Erreur technique lors de la réservation");
    } finally {
        setBookingLoading(false);
    }
};

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
        const relativeCallbackUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
        router.push(`/login?callbackUrl=${encodeURIComponent(relativeCallbackUrl)}`);
        return;
    }

    if (!messageContent.trim()) return;

    setMessageLoading(true);
    try {
        const result = await contactHost(listing!.id, messageContent);
        
        if (result.success) {
            toast.success("Message envoyé à l'hôte !");
            setIsMessageOpen(false);
            setMessageContent("");
        } else {
            toast.error(result.error || "Erreur lors de l'envoi");
        }
    } catch (error) {
        toast.error("Impossible d'envoyer le message");
    } finally {
        setMessageLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Lien copié !", { icon: <Share2 className="w-4 h-4"/> });
  };

  // ✅ NOUVELLE FONCTION UNIFIÉE
  const toggleWishlist = async () => {
    if (!session) {
        toast.error("Connectez-vous pour ajouter aux favoris");
        return;
    }
    
    // Mise à jour optimiste (UI instantanée)
    const previousState = isWishlisted;
    setIsWishlisted(!isWishlisted);

    try {
        const result = await toggleWishlistAction(listing!.id);
        
        if (result.success) {
            toast.success(result.message);
        } else {
            // Rollback en cas d'erreur
            setIsWishlisted(previousState);
            toast.error(result.error || "Erreur action favoris");
        }
    } catch (error) {
        setIsWishlisted(previousState);
        toast.error("Impossible de modifier les favoris");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div>;
  if (!listing) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-white">Annonce introuvable</div>;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans pb-20 selection:bg-orange-500/30 relative">
      
      {/* --- HEADER FLOTTANT --- */}
      <div className="sticky top-0 z-40 bg-[#0B1120]/80 backdrop-blur-md border-b border-white/5 px-4 lg:px-8 py-4 flex justify-between items-center transition-all">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-sm font-medium">
            <ChevronLeft className="w-5 h-5" /> <span className="hidden lg:inline">Retour</span>
        </button>
        <div className="flex gap-3">
            <button onClick={handleShare} className="p-2 hover:bg-white/10 rounded-full transition-colors group">
                <Share2 className="w-5 h-5 text-slate-400 group-hover:text-white" />
            </button>
            <button onClick={toggleWishlist} className="p-2 hover:bg-white/10 rounded-full transition-colors group">
                <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-slate-400 group-hover:text-red-500'}`} />
            </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto lg:px-8 lg:py-8">
        
        {/* GALERIE PHOTO (Code inchangé) */}
        <div className="lg:hidden relative aspect-[4/3] w-full bg-slate-900 group">
            <img src={listing.images[currentImageIndex]} alt="Listing" className="w-full h-full object-cover transition-opacity duration-300"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-40"></div>
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white">
                {currentImageIndex + 1} / {listing.images.length}
            </div>
            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white opacity-0 group-hover:opacity-100 transition"><ChevronLeft className="w-5 h-5"/></button>
            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white opacity-0 group-hover:opacity-100 transition"><ChevronRight className="w-5 h-5"/></button>
        </div>

        <div className="hidden lg:grid grid-cols-4 grid-rows-2 gap-2 h-[450px] rounded-2xl overflow-hidden mb-10">
            <div className="col-span-2 row-span-2 relative cursor-pointer group bg-slate-900">
                <img src={listing.images[currentImageIndex]} className="w-full h-full object-cover transition duration-500" alt="Vue Principale" />
                <div className="absolute top-4 left-4 bg-orange-500 text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg opacity-0 group-hover:opacity-100 transition">Vue Actuelle</div>
            </div>
            {listing.images.slice(0, 4).map((img, idx) => (
                <div key={idx} onClick={() => setMainImage(idx)} className={`col-span-1 row-span-1 relative cursor-pointer group overflow-hidden ${currentImageIndex === idx ? 'ring-2 ring-inset ring-orange-500' : ''}`}>
                     <img src={img} className="w-full h-full object-cover transition group-hover:scale-110" alt={`Vue ${idx}`} />
                     <div className={`absolute inset-0 transition ${currentImageIndex === idx ? 'bg-transparent' : 'bg-black/30 group-hover:bg-transparent'}`}></div>
                </div>
            ))}
            {listing.images.length > 5 && (
                 <div className="col-span-1 row-span-1 relative cursor-pointer group bg-slate-800 flex items-center justify-center" onClick={() => toast.info("Galerie complète bientôt disponible")}>
                     <div className="flex flex-col items-center gap-2 text-white font-bold text-sm z-10">
                        <LayoutGrid className="w-6 h-6"/> +{listing.images.length - 4} photos
                     </div>
                     <img src={listing.images[4]} className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm" />
                 </div>
            )}
        </div>
        
        {/* INFOS & RÉSERVATION */}
        <div className="px-4 lg:px-0 grid grid-cols-1 lg:grid-cols-3 gap-12 pt-4 lg:pt-0">
            
            {/* COLONNE GAUCHE */}
            <div className="lg:col-span-2 space-y-8 pb-20">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-black text-white mb-2 leading-tight">{listing.title}</h1>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <MapPin className="w-4 h-4 text-orange-500" />
                            {listing.address}, {listing.city}
                        </div>
                    </div>
                    
                    {/* --- PROFIL HÔTE & CONTACT --- */}
                    <div className="flex flex-col items-center gap-2">
                         <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-lg relative group cursor-pointer">
                            {listing.host.image ? <img src={listing.host.image} className="w-full h-full object-cover"/> : <User className="w-full h-full p-3 text-slate-500"/>}
                         </div>
                         <button 
                            onClick={() => setIsMessageOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-400 transition bg-orange-500/10 px-3 py-1.5 rounded-full hover:bg-orange-500/20"
                         >
                            <MessageSquare className="w-3 h-3" /> Contacter
                         </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 pb-6 border-b border-white/5">
                    <span className="bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3"/> Hôte Vérifié
                    </span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3"/> Nettoyage Pro
                    </span>
                </div>

                <div>
                    <h2 className="text-lg font-bold text-white mb-4">À propos</h2>
                    <p className="text-slate-400 leading-relaxed text-sm text-justify">{listing.description}</p>
                </div>

                <div>
                    <h2 className="text-lg font-bold text-white mb-6">Ce que propose ce logement</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { icon: Wifi, label: "Wifi Fibre Optique", color: "text-blue-400" },
                            { icon: Car, label: "Parking Gratuit", color: "text-orange-400" },
                            { icon: Tv, label: "Smart TV & Netflix", color: "text-purple-400" },
                            { icon: Wind, label: "Climatisation", color: "text-cyan-400" },
                            { icon: Coffee, label: "Machine à café", color: "text-amber-700" } 
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 text-slate-300 p-4 bg-slate-900 rounded-xl border border-white/5 hover:border-white/10 transition">
                                <item.icon className={`w-5 h-5 ${item.color}`} /> 
                                <span className="text-sm font-medium">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* COLONNE DROITE : RÉSERVATION (Code inchangé) */}
            <div className="relative">
                <div className="sticky top-28 bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl shadow-black/50">
                    <div className="flex justify-between items-end mb-6">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">{listing.pricePerNight.toLocaleString()}</span>
                            <span className="text-orange-500 font-bold text-xs">FCFA</span>
                            <span className="text-slate-500 text-xs">/ nuit</span>
                        </div>
                        <div className="flex items-center gap-1">
                             <span className="text-xs font-bold text-white">4.8</span>
                             <Star className="w-3 h-3 text-orange-500 fill-orange-500" />
                        </div>
                    </div>
                    <div className="space-y-3 mb-6">
                        <div className="grid grid-cols-2 gap-0 border border-slate-700 rounded-xl overflow-hidden">
                            <div className="p-3 border-r border-slate-700 bg-[#0B1120]">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Arrivée</label>
                                <input type="date" className="w-full bg-transparent text-white text-xs font-bold outline-none cursor-pointer" onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                            <div className="p-3 bg-[#0B1120]">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Départ</label>
                                <input type="date" className="w-full bg-transparent text-white text-xs font-bold outline-none cursor-pointer" onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    {nights > 0 ? (
                        <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between text-slate-400 text-sm">
                                <span>{listing.pricePerNight.toLocaleString()} x {nights} nuits</span>
                                <span>{totalPrice.toLocaleString()} F</span>
                            </div>
                            <div className="flex justify-between text-slate-400 text-sm">
                                <span>Frais de service (10%)</span>
                                <span>{serviceFee.toLocaleString()} F</span>
                            </div>
                            <div className="h-px bg-white/10 my-2"></div>
                            <div className="flex justify-between text-white font-bold text-lg">
                                <span>Total</span>
                                <span>{totalPayable.toLocaleString()} FCFA</span>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                            <p className="text-xs text-orange-300 text-center">Sélectionnez vos dates pour voir le total.</p>
                        </div>
                    )}
                    <button 
                        onClick={handleReserve}
                        disabled={bookingLoading || nights < 1}
                        className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wide"
                    >
                        {bookingLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <CalendarIcon className="w-5 h-5" />}
                        {nights > 0 ? (session ? "Réserver maintenant" : "Connectez-vous pour réserver") : "Vérifier disponibilité"}
                    </button>
                    <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-500">
                        <ShieldCheck className="w-3 h-3" /> Paiement sécurisé par ImmoFacile
                    </div>
                </div>
            </div>
        </div>
      </main>

      {/* --- MODAL DE MESSAGE --- */}
      {isMessageOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                <button 
                    onClick={() => setIsMessageOpen(false)} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-orange-500" />
                    Contacter {listing.host.name}
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                    Posez vos questions concernant <strong>{listing.title}</strong>.
                </p>

                <form onSubmit={handleSendMessage} className="space-y-4">
                    <textarea 
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="Bonjour, ce logement est-il disponible pour..."
                        className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none placeholder:text-slate-600"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button"
                            onClick={() => setIsMessageOpen(false)}
                            className="px-4 py-2 text-slate-400 font-bold text-sm hover:text-white transition"
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit"
                            disabled={messageLoading || !messageContent.trim()}
                            className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {messageLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <Send className="w-4 h-4" />}
                            Envoyer
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}
