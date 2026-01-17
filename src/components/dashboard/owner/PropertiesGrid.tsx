"use client";

import Link from "next/link";
import Image from "next/image"; // Optionnel : Si configuré, sinon gardez img
import { Home, MapPin, Plus, Zap, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Property {
  id: string;
  title: string;
  price: number;
  commune: string;
  images: string[];
  isAvailable?: boolean; // J'ai simplifié le typage optionnel
}

interface PropertiesGridProps {
  properties: Property[];
  onDelegate?: (property: Property) => void;
}

export default function PropertiesGrid({ properties, onDelegate }: PropertiesGridProps) {
  
  const formatPrice = (price: number) => {
    return (price || 0).toLocaleString('fr-FR') + ' FCFA';
  };

  return (
    <section className="space-y-6">
      
      {/* HEADER DE SECTION */}
      <div className="flex justify-between items-end">
        <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-500" /> Vos Biens Immobiliers
            </h3>
            <p className="text-slate-500 text-xs mt-1">Gérez votre parc et vos disponibilités.</p>
        </div>
        
        <Link 
          href="/dashboard/owner/properties/add" 
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Ajouter un bien
        </Link>
      </div>

      {/* GRILLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties && properties.length > 0 ? (
          properties.map((prop) => (
            <div key={prop.id} className="group relative bg-[#131b2e] border border-slate-800/50 rounded-3xl overflow-hidden hover:border-slate-600/50 transition duration-300 shadow-xl flex flex-col">
              
              {/* ZONE IMAGE CLIQUABLE */}
              <Link href={`/dashboard/owner/properties/${prop.id}`} className="relative h-48 overflow-hidden shrink-0 block">
                  {prop.images && prop.images.length > 0 ? (
                    // Note: Si vous utilisez Next/Image, remplacez img par Image (nécessite config next.config.js)
                    <img 
                        src={prop.images[0]} 
                        alt={prop.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-700 ease-out" 
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-slate-500 gap-2">
                        <ImageOff className="w-8 h-8 opacity-50" />
                        <span className="text-[10px] font-bold uppercase">Sans image</span>
                    </div>
                  )}
                  
                  {/* OVERLAY PRIX */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#131b2e] via-transparent to-transparent opacity-90"></div>
                  
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg">
                      <span className="text-white font-bold text-xs">{formatPrice(prop.price)}</span>
                  </div>

                  <div className="absolute top-3 left-3">
                      <Badge className={`${prop.isAvailable ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'} text-white border-0 text-[10px] px-2 py-0.5 shadow-lg`}>
                          {prop.isAvailable ? 'DISPONIBLE' : 'LOUÉ'}
                      </Badge>
                  </div>
              </Link>

              {/* INFO CONTENT */}
              <div className="p-5 pt-3 relative flex flex-col flex-1">
                <div className="mb-4">
                    <Link href={`/dashboard/owner/properties/${prop.id}`}>
                        <h4 className="font-bold text-white text-lg leading-tight group-hover:text-blue-400 transition truncate">{prop.title}</h4>
                    </Link>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-600" /> {prop.commune}
                    </p>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-center gap-3">
                    
                    {/* ✅ CORRECTION : Pas de Button dans Link. On utilise Link avec classes boutons */}
                    <Link 
                        href={`/dashboard/owner/properties/${prop.id}`} 
                        className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-bold ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white h-9 px-4 py-2"
                    >
                        Gérer
                    </Link>

                    {/* BOUTON DÉLÉGUER */}
                    {onDelegate && (
                        <Button 
                            onClick={() => onDelegate(prop)}
                            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white border-0 shadow-lg shadow-orange-500/20 text-xs font-bold h-9"
                        >
                            <Zap className="w-3 h-3 mr-1.5 fill-white" /> Déléguer
                        </Button>
                    )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">🏠</div>
            <p className="text-slate-400 font-medium mb-1">Votre parc est vide.</p>
            <p className="text-slate-600 text-xs mb-4">Commencez par ajouter votre premier bien immobilier.</p>
            <Link 
              href="/dashboard/owner/properties/add" 
              className="text-blue-500 font-bold hover:text-blue-400 hover:underline text-sm transition"
            >
              + Ajouter maintenant
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
