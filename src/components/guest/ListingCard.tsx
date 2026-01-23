"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Star, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; // Assurez-vous d'avoir une fonction cn ou retirez-la pour des strings simples

interface ListingCardProps {
  data: {
    id: string;
    title: string;
    price: number;
    location: string;
    image: string | null;
    rating: string | number;
    isFavorite: boolean;
  };
  currentUserEmail?: string | null;
}

export default function ListingCard({ data, currentUserEmail }: ListingCardProps) {
  const [isFavorite, setIsFavorite] = useState(data.isFavorite);
  const [loadingFav, setLoadingFav] = useState(false);

  // GESTION DU FAVORIS (LIKE)
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserEmail) {
        toast.error("Connectez-vous pour ajouter aux favoris.");
        return;
    }

    setLoadingFav(true);
    // On inverse l'état visuellement tout de suite (Optimistic UI)
    setIsFavorite(!isFavorite);

    try {
        const res = await fetch("/api/wishlist", { // Assurez-vous que votre route wishlist est bien ici
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listingId: data.id, userEmail: currentUserEmail })
        });
        
        if (!res.ok) throw new Error();
        
        const responseData = await res.json();
        toast.success(responseData.message);

    } catch (error) {
        setIsFavorite(!isFavorite); // On remet l'état d'avant en cas d'erreur
        toast.error("Erreur lors de la mise à jour des favoris");
    } finally {
        setLoadingFav(false);
    }
  };

  return (
    <div className="group bg-slate-900 border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/30 transition-all duration-300 flex flex-col h-full">
      
      {/* IMAGE + BADGES */}
      <div className="h-56 bg-slate-800 relative overflow-hidden">
        {data.image ? (
            <img 
                src={data.image} 
                alt={data.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600 font-medium">
                Image non disponible
            </div>
        )}
        
        {/* Note */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold text-white z-10">
            <Star className="w-3 h-3 text-orange-400 fill-orange-400" /> {data.rating}
        </div>

        {/* Bouton Favoris */}
        <button 
            onClick={toggleFavorite}
            disabled={loadingFav}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-white hover:text-red-500 transition-all z-20 group/heart"
        >
            {loadingFav ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
                <Heart 
                    className={`w-4 h-4 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white group-hover/heart:text-red-500'}`} 
                />
            )}
        </button>
      </div>

      {/* CONTENU */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-white text-lg leading-tight group-hover:text-orange-400 transition-colors line-clamp-1">
            {data.title}
        </h3>
        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1 mb-4">
            <MapPin className="w-3 h-3 shrink-0" /> {data.location}
        </p>
        
        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
            <div>
                <span className="text-xl font-black text-white">{data.price.toLocaleString()} F</span>
                <span className="text-slate-500 text-xs"> / nuit</span>
            </div>
            
            {/* BOUTON RÉSERVER -> Redirige vers le détail */}
            <Link href={`/akwaba/${data.id}`}>
                <button className="text-xs font-bold text-white bg-white/10 px-4 py-2 rounded-lg hover:bg-orange-500 hover:text-black transition duration-300">
                    Réserver
                </button>
            </Link>
        </div>
      </div>
    </div>
  );
}
