"use client";

import { MapPin, Star, User, Eye, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

interface ListingProps {
  listing: {
    id: string;
    title: string;
    city: string;
    neighborhood: string | null;
    pricePerNight: number;
    images: string[];
    isPublished: boolean;
    host: { name: string | null, image: string | null };
    bookings: { totalPrice: number }[];
    _count: { reviews: number, bookings: number };
  };
}

export default function AgencyListingCard({ listing }: ListingProps) {
  
  // Calcul CA spécifique à cette annonce
  const totalRevenue = listing.bookings.reduce((sum, b) => sum + b.totalPrice, 0);
  
  // Image par défaut
  const mainImage = listing.images[0] || "https://placehold.co/600x400/1e293b/cbd5e1?text=Akwaba";

  return (
    <div className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-orange-500/30 transition flex flex-col h-full relative">
      
      {/* IMAGE HEADER */}
      <div className="h-48 relative bg-slate-800">
        <img 
            src={mainImage} 
            alt={listing.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
        />
        
        {/* Badge Statut */}
        <div className="absolute top-3 left-3">
            {listing.isPublished ? (
                <Badge className="bg-emerald-500 text-white border-none shadow-lg">EN LIGNE</Badge>
            ) : (
                <Badge variant="secondary" className="bg-slate-200 text-slate-900 shadow-lg">BROUILLON</Badge>
            )}
        </div>

        {/* Prix */}
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-lg font-bold border border-white/10">
            {listing.pricePerNight.toLocaleString()} F <span className="text-xs font-normal">/ nuit</span>
        </div>
      </div>

      {/* CONTENU */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-white font-bold text-lg line-clamp-1" title={listing.title}>
                        {listing.title}
                    </h3>
                    <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                        <MapPin size={12} className="text-orange-500" />
                        {listing.city} {listing.neighborhood && `• ${listing.neighborhood}`}
                    </div>
                </div>
            </div>

            {/* Stats Rapides */}
            <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                    <p className="text-[10px] text-slate-500 uppercase">Réservations</p>
                    <p className="text-white font-bold">{listing._count.bookings}</p>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                    <p className="text-[10px] text-slate-500 uppercase">Revenus</p>
                    <p className="text-emerald-500 font-bold text-sm">
                        {(totalRevenue / 1000).toFixed(0)}k F
                    </p>
                </div>
            </div>

            {/* Host Info */}
            <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-800/50">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                    {listing.host.image ? (
                         <img src={listing.host.image} alt="Host" className="w-full h-full object-cover" />
                    ) : (
                        <User size={12} className="text-slate-400" />
                    )}
                </div>
                <p className="text-xs text-slate-500">
                    Proprio: <span className="text-slate-300 font-medium">{listing.host.name || "Inconnu"}</span>
                </p>
            </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-4 pt-4 flex items-center gap-2">
            <Link href={`/listing/${listing.id}`} target="_blank" className="flex-1">
                <Button variant="outline" size="sm" className="w-full border-slate-700 hover:bg-slate-800 text-slate-300">
                    <Eye className="w-4 h-4 mr-2" /> Voir
                </Button>
            </Link>
            <Link href={`/dashboard/agency/listings/${listing.id}`} className="flex-1">
                <Button size="sm" className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
                    <Edit className="w-4 h-4 mr-2" /> Gérer
                </Button>
            </Link>
        </div>
      </div>
    </div>
  );
}
