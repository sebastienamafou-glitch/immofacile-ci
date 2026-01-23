"use client";

import { MapPin, BedDouble, Bath, Ruler, AlertTriangle, CheckCircle2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

// Définition du type local basé sur la requête Prisma de la page
interface PropertyProps {
  property: {
    id: string;
    title: string;
    address: string;
    commune: string;
    price: number;
    images: string[];
    bedrooms: number;
    bathrooms: number;
    surface: number | null;
    isPublished: boolean;
    owner: { name: string | null };
    leases: any[]; // Utilisé pour vérifier l'occupation
    _count: { incidents: number };
  };
}

export default function AgencyPropertyCard({ property }: PropertyProps) {
  // Logique Métier : Est-ce loué ?
  const isRented = property.leases.length > 0;
  
  // Image par défaut si pas d'image
  const mainImage = property.images[0] || "https://placehold.co/600x400/1e293b/cbd5e1?text=Pas+d'image";

  return (
    <div className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-600 transition flex flex-col h-full">
      
      {/* IMAGE HEADER */}
      <div className="h-48 relative bg-slate-800">
        <img 
            src={mainImage} 
            alt={property.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
        />
        
        {/* Badge Statut */}
        <div className="absolute top-3 right-3">
            {isRented ? (
                <Badge className="bg-emerald-500 text-white border-none shadow-lg flex gap-1 items-center">
                    <CheckCircle2 size={12} /> LOUÉ
                </Badge>
            ) : (
                <Badge variant="secondary" className="bg-white/90 text-slate-900 shadow-lg">
                    DISPONIBLE
                </Badge>
            )}
        </div>

        {/* Badge Incident */}
        {property._count.incidents > 0 && (
             <div className="absolute top-3 left-3">
                <Badge variant="destructive" className="flex gap-1 items-center animate-pulse">
                    <AlertTriangle size={12} /> {property._count.incidents} Incident(s)
                </Badge>
            </div>
        )}
      </div>

      {/* CONTENU */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-white font-bold text-lg line-clamp-1" title={property.title}>
                        {property.title}
                    </h3>
                    <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                        <MapPin size={12} className="text-orange-500" />
                        {property.commune}, {property.address}
                    </div>
                </div>
            </div>

            {/* Infos Propriétaire */}
            <div className="mt-3 flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800/50">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                    <User size={12} />
                </div>
                <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Propriétaire</p>
                    <p className="text-xs text-slate-300 font-medium truncate max-w-[150px]">
                        {property.owner.name || "Inconnu"}
                    </p>
                </div>
            </div>

            {/* Caractéristiques */}
            <div className="flex items-center gap-4 mt-4 text-slate-400 text-xs">
                <div className="flex items-center gap-1" title="Chambres">
                    <BedDouble size={14} /> {property.bedrooms}
                </div>
                <div className="flex items-center gap-1" title="Salles de bain">
                    <Bath size={14} /> {property.bathrooms}
                </div>
                {property.surface && (
                    <div className="flex items-center gap-1" title="Surface">
                        <Ruler size={14} /> {property.surface} m²
                    </div>
                )}
            </div>
        </div>

        {/* FOOTER PRIX & ACTION */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
                <p className="text-xs text-slate-500">Loyer mensuel</p>
                <p className="text-lg font-black text-white">
                    {property.price.toLocaleString()} <span className="text-xs text-orange-500">FCFA</span>
                </p>
            </div>
            
            <Link href={`/dashboard/agency/properties/${property.id}`}>
                <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800 hover:text-white">
                    Gérer
                </Button>
            </Link>
        </div>
      </div>
    </div>
  );
}
