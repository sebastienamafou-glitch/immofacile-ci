"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Square, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PropertyCardProps {
  id: string;
  title: string;
  price: number;
  location: string;
  surface: number;
  images: string[];
  isVerified?: boolean;
  type: "SALE" | "RENTAL";
  legalStatus?: string; // Spécifique à la vente
}

export function PropertyCard({ 
  id, title, price, location, surface, images, isVerified, type, legalStatus 
}: PropertyCardProps) {
  const href = type === "SALE" ? `/sales/${id}` : `/properties/${id}`;

  return (
    <Link href={href} className="group bg-white/5 border border-slate-800 rounded-3xl overflow-hidden hover:border-orange-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image 
          src={images[0] || "/placeholder.jpg"} 
          alt={title} 
          fill 
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent" />
        
        <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-orange-500 text-white border-none font-black text-[10px] px-3 py-1">
                {type === "SALE" ? "À VENDRE" : "LOCATION"}
            </Badge>
            {isVerified && (
                <Badge className="bg-emerald-500 text-white border-none font-black text-[10px] px-3 py-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> CERTIFIÉ
                </Badge>
            )}
        </div>

        <div className="absolute bottom-4 left-4 right-4">
            <p className="text-2xl font-black text-white">
                {price.toLocaleString()} <span className="text-sm font-bold text-orange-500">FCFA</span>
            </p>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <MapPin className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold uppercase tracking-widest">{location}</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-4 line-clamp-1 group-hover:text-orange-400 transition-colors">
          {title}
        </h3>
        
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
          <div className="flex items-center gap-2 text-slate-300">
            <Square className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold">{surface} m²</span>
          </div>
          {legalStatus && (
            <span className="text-[10px] font-black text-orange-500 border border-orange-500/30 px-2 py-1 rounded">
                {legalStatus.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
