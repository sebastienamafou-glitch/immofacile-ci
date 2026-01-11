"use client";

import Link from "next/link";
import { Home, MapPin, Plus, ArrowRight, Zap } from "lucide-react"; // Ajout de Zap pour l'icône éclair
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Assurez-vous d'avoir ce composant UI

interface Property {
  id: string;
  title: string;
  price: number;
  commune: string;
  images: string[];
  imageUrl?: string;
  type?: string;
  isAvailable?: boolean;
}

interface PropertiesGridProps {
  properties: Property[];
  onDelegate?: (property: Property) => void; // 👇 NOUVEAU : Fonction reçue du parent
}

export default function PropertiesGrid({ properties, onDelegate }: PropertiesGridProps) {
  
  const formatPrice = (price: number) => {
    return price?.toLocaleString('fr-FR') + ' FCFA';
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
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Ajouter un bien
        </Link>
      </div>

      {/* GRILLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {properties && properties.length > 0 ? (
          properties.map((prop) => (
            <div key={prop.id} className="group relative bg-[#131b2e] border border-slate-800/50 rounded-3xl overflow-hidden hover:border-slate-600/50 transition duration-300 shadow-xl flex flex-col">
              
              {/* IMAGE COVER */}
              <div className="relative h-48 overflow-hidden shrink-0">
                <Link href={`/dashboard/owner/properties/${prop.id}`}>
                    {prop.images && prop.images.length > 0 ? (
                    <img 
                        src={prop.images[0]} 
                        alt={prop.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-700 ease-out" 
                    />
                    ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <Home className="w-12 h-12 text-slate-700" />
                    </div>
                    )}
                    
                    {/* OVERLAY */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131b2e] via-transparent to-transparent opacity-90"></div>
                </Link>

                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg">
                    <span className="text-white font-bold text-xs">{formatPrice(prop.price)}</span>
                </div>

                <div className="absolute top-4 left-4">
                    <Badge className={`${prop.isAvailable ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'} border-0 text-[10px] px-2 py-0.5 shadow-lg`}>
                        {prop.isAvailable ? 'DISPONIBLE' : 'LOUÉ'}
                    </Badge>
                </div>
              </div>

              {/* INFO CONTENT */}
              <div className="p-5 pt-2 relative flex flex-col flex-1">
                <div className="mb-1">
                    <Link href={`/dashboard/owner/properties/${prop.id}`}>
                        <h4 className="font-bold text-white text-lg leading-tight group-hover:text-blue-400 transition truncate">{prop.title}</h4>
                    </Link>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {prop.commune}
                    </p>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-center gap-3">
                    
                    {/* Bouton GÉRER (Existant) */}
                    <Link href={`/dashboard/owner/properties/${prop.id}`} className="flex-1">
                        <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold h-9">
                            Gérer
                        </Button>
                    </Link>

                    {/* 👇 NOUVEAU BOUTON : DÉLÉGUER (UBER) */}
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
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🏠</div>
            <p className="text-slate-400 font-medium mb-1">Votre parc est vide.</p>
            <p className="text-slate-600 text-xs mb-4">Commencez par ajouter votre premier bien immobilier.</p>
            <Link 
              href="/dashboard/owner/properties/add" 
              className="text-blue-500 font-bold hover:underline text-sm"
            >
              + Ajouter maintenant
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
