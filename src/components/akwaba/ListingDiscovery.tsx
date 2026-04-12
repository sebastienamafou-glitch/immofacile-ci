"use client";

import { useState } from "react";
import { Map as MapIcon, LayoutGrid, Star, MapPin, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// ✅ TYPAGE STRICT : On définit exactement ce dont on a besoin
export interface ListingItem {
  id: string;
  title: string;
  pricePerNight: number;
  city: string;
  neighborhood: string | null;
  images: string[];
  reviews?: { rating: number }[];
  // Ajoute latitude et longitude si MapComponent en a besoin
  latitude?: number | null; 
  longitude?: number | null;
}

const MapComponent = dynamic(() => import("./MapComponent"), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 w-full rounded-3xl">
        <Loader2 className="animate-spin text-orange-500 mb-2" />
        <p className="text-[10px] font-black text-slate-500 uppercase">Initialisation de la carte...</p>
    </div>
  )
});

interface ListingDiscoveryProps {
  listings: ListingItem[];
}

export default function ListingDiscovery({ listings }: ListingDiscoveryProps) {
  const [view, setView] = useState<"grid" | "map">("grid");

  return (
    <main className="relative min-h-[calc(100vh-120px)] bg-[#0B1120] overflow-hidden">
      
      {/* ✅ OPTIMISATION ARCHITECTURALE : 
        On utilise le CSS pour masquer (hidden) plutôt que de détruire le composant. 
        Cela évite à Leaflet de se recharger à chaque clic !
      */}
      
      {/* --- VUE GRILLE --- */}
      <div className={cn(
        "max-w-7xl mx-auto px-4 lg:px-8 py-10 transition-opacity duration-500 w-full",
        view === "grid" ? "opacity-100 relative z-10 block" : "opacity-0 absolute z-0 hidden"
      )}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {listings.map((item) => (
            <ListingCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* --- VUE CARTE --- */}
      <div className={cn(
        "w-full h-[calc(100vh-120px)] relative transition-opacity duration-500",
        view === "map" ? "opacity-100 z-10 block" : "opacity-0 z-0 hidden"
      )}>
        {/* En gardant MapComponent monté, il reste fluide */}
        <MapComponent listings={listings} />
        
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-2xl">
            <MapPin size={12} className="text-orange-500" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                {listings.length} pépites localisées
            </span>
        </div>
      </div>

      {/* --- BOUTON FLOTTANT D'ACTION --- */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000]">
        <button 
          onClick={() => setView(view === "grid" ? "map" : "grid")}
          className="bg-[#1E293B]/90 border border-white/10 hover:border-orange-500/50 text-white px-8 py-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center gap-3 transition-all active:scale-95 group"
        >
          {view === "grid" ? (
            <>
              <span className="text-xs font-black uppercase tracking-widest">Afficher la carte</span>
              <MapIcon size={18} className="text-orange-500 group-hover:rotate-12 transition-transform" />
            </>
          ) : (
            <>
              <span className="text-xs font-black uppercase tracking-widest">Afficher la liste</span>
              <LayoutGrid size={18} className="text-orange-500" />
            </>
          )}
        </button>
      </div>
    </main>
  );
}

function ListingCard({ item }: { item: ListingItem }) {
    // Calcul de la note robuste
    const avgRating = item.reviews && item.reviews.length > 0 
        ? (item.reviews.reduce((acc, rev) => acc + rev.rating, 0) / item.reviews.length).toFixed(1)
        : "Nouveau";

    // Sécurisation de l'image (au cas où le tableau soit vide)
    const displayImage = item.images && item.images.length > 0 ? item.images[0] : "/images/placeholder.jpg";

    return (
        <Link href={`/akwaba/listings/${item.id}`} className="group">
            <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-orange-500/50 transition-all duration-500 shadow-xl">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-800">
                    <Image 
                        src={displayImage} 
                        alt={item.title} 
                        fill 
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    <div className="absolute top-4 left-4 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                         <Star size={10} className="text-orange-500 fill-orange-500" />
                         <span className="text-[10px] font-black text-white">{avgRating}</span>
                    </div>
                    <div className="absolute bottom-4 left-4 bg-orange-600 text-white font-black px-4 py-2 rounded-xl text-sm shadow-xl">
                        {item.pricePerNight.toLocaleString()} F
                    </div>
                </div>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-white group-hover:text-orange-500 transition-colors uppercase line-clamp-1">
                        {item.title}
                    </h3>
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold mt-2 uppercase tracking-tighter">
                        <MapPin size={12} className="text-orange-500" /> 
                        {item.neighborhood ? `${item.neighborhood}, ` : ""}{item.city}
                    </div>
                </div>
            </div>
        </Link>
    );
}
