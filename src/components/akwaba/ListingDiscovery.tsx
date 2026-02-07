"use client";

import { useState } from "react";
import { Map as MapIcon, LayoutGrid, Star, MapPin, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

// Chargement dynamique de la carte (Client-side only)
const MapComponent = dynamic(() => import("./MapComponent"), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900">
        <Loader2 className="animate-spin text-orange-500 mb-2" />
        <p className="text-[10px] font-black text-slate-500 uppercase">Initialisation de la carte...</p>
    </div>
  )
});

export default function ListingDiscovery({ listings }: { listings: any[] }) {
  const [view, setView] = useState<"grid" | "map">("grid");

  return (
    <main className="relative min-h-[calc(100vh-120px)] bg-[#0B1120]">
      
      {/* --- VUE GRILLE --- */}
      {view === "grid" && (
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((item) => (
              <ListingCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* --- VUE CARTE (Leaflet) --- */}
      {view === "map" && (
        <div className="w-full h-[calc(100vh-120px)] relative animate-in zoom-in-95 duration-300">
          <MapComponent listings={listings} />
          
          {/* Badge de localisation actuel (Overlay) */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
              <MapPin size={12} className="text-orange-500" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                  {listings.length} pépites localisées
              </span>
          </div>
        </div>
      )}

      {/* --- BOUTON FLOTTANT D'ACTION --- */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000]">
        <button 
          onClick={() => setView(view === "grid" ? "map" : "grid")}
          className="bg-[#1E293B]/80 border border-white/10 hover:border-orange-500/50 text-white px-8 py-4 rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-3 transition-all active:scale-95 group"
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

function ListingCard({ item }: { item: any }) {
    const avgRating = item.reviews?.length > 0 
        ? (item.reviews.reduce((acc: any, rev: any) => acc + rev.rating, 0) / item.reviews.length).toFixed(1)
        : "Nouveau";

    return (
        <Link href={`/akwaba/listings/${item.id}`} className="group">
            <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-orange-500/50 transition-all duration-500 shadow-xl">
                <div className="relative aspect-[16/10] overflow-hidden">
                    <Image src={item.images[0]} alt={item.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 left-4 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                         <Star size={10} className="text-orange-500 fill-orange-500" />
                         <span className="text-[10px] font-black text-white">{avgRating}</span>
                    </div>
                    <div className="absolute bottom-4 left-4 bg-orange-600 text-white font-black px-4 py-2 rounded-xl text-sm shadow-xl">
                        {item.pricePerNight.toLocaleString()} F
                    </div>
                </div>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-white group-hover:text-orange-500 transition-colors uppercase line-clamp-1">{item.title}</h3>
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold mt-2 uppercase tracking-tighter">
                        <MapPin size={12} className="text-orange-500" /> {item.neighborhood}, {item.city}
                    </div>
                </div>
            </div>
        </Link>
    );
}
