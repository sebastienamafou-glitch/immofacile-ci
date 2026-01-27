"use client";

import Link from "next/link";
import { MapPin, BedDouble, Bath, Ruler, ArrowRight, Image as ImageIcon, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// ✅ IMPORT DU TYPE OFFICIEL (Source de vérité)
import { Property } from "@prisma/client";

// ✅ INTERFACE ÉTENDUE : On prend tout Prisma + les stats optionnelles
// Cela permet d'accepter à la fois une Property simple ET une PropertyWithStats
interface RichProperty extends Property {
  activeLeaseCount?: number;
  totalRentGenerated?: number;
}

interface PropertiesGridProps {
  properties: RichProperty[]; // On accepte le format riche
  onDelegate: (property: RichProperty) => void;
}

export default function PropertiesGrid({ properties, onDelegate }: PropertiesGridProps) {
  
  if (!properties || properties.length === 0) {
    return (
        <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl border-dashed">
            <h3 className="text-white font-bold text-lg">Aucun bien trouvé</h3>
            <p className="text-slate-500">Vous n'avez pas encore ajouté de propriété.</p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <div key={property.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-300 flex flex-col">
          
          {/* --- IMAGE HEADER --- */}
          <Link href={`/dashboard/owner/properties/${property.id}`} className="block relative h-48 overflow-hidden bg-slate-800 cursor-pointer">
            {property.images && property.images.length > 0 ? (
                <img 
                    src={property.images[0]} 
                    alt={property.title || "Bien immobilier"} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-xs">Pas d'image</span>
                </div>
            )}

            {/* Badges Statut */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
                <Badge className={`${property.isAvailable ? 'bg-emerald-500' : 'bg-blue-600'} text-white border-none shadow-md`}>
                    {property.isAvailable ? 'DISPONIBLE' : 'LOUÉ'}
                </Badge>
            </div>
            
            <div className="absolute top-3 right-3">
                 <Badge variant="outline" className="bg-slate-950/80 text-white border-slate-700 backdrop-blur-sm">
                    {(property.price || 0).toLocaleString()} F
                 </Badge>
            </div>
          </Link>

          {/* --- CONTENU --- */}
          <div className="p-5 flex-1 flex flex-col">
            <div className="flex-1">
                <Link href={`/dashboard/owner/properties/${property.id}`}>
                    <h3 className="text-lg font-bold text-white line-clamp-1 group-hover:text-orange-500 transition-colors mb-1">
                        {property.title || "Titre inconnu"}
                    </h3>
                </Link>
                
                <div className="flex items-center gap-1 text-slate-400 text-xs mb-4">
                    <MapPin className="w-3 h-3 text-orange-500" /> 
                    {property.commune || "Abidjan"}, {property.address || ""}
                </div>

                {/* Caractéristiques */}
                <div className="flex items-center gap-4 text-slate-300 text-xs bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                    <div className="flex items-center gap-1.5" title="Chambres">
                        <BedDouble className="w-4 h-4 text-slate-500" /> {property.bedrooms || 0}
                    </div>
                    <div className="w-px h-3 bg-slate-700"></div>
                    <div className="flex items-center gap-1.5" title="Salles de bain">
                        <Bath className="w-4 h-4 text-slate-500" /> {property.bathrooms || 0}
                    </div>
                    {property.surface && (
                        <>
                            <div className="w-px h-3 bg-slate-700"></div>
                            <div className="flex items-center gap-1.5" title="Surface">
                                <Ruler className="w-4 h-4 text-slate-500" /> {property.surface} m²
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* --- FOOTER ACTIONS --- */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <Button 
                    onClick={() => onDelegate(property)}
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-slate-700 bg-transparent text-slate-300 hover:bg-[#F59E0B] hover:text-black hover:border-[#F59E0B] transition-colors text-xs font-bold"
                >
                    <Key className="w-3.5 h-3.5 mr-2" />
                    Déléguer
                </Button>

                <Link href={`/dashboard/owner/properties/${property.id}`}>
                    <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-3">
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
