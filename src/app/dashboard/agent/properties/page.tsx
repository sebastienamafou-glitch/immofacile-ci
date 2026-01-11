"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, Home, MapPin, BedDouble, Bath, Square, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function AgentPropertiesPage() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        // On récupère les propriétés gérées par l'agent via le dashboard
        // (Ou via une route dédiée si vous en avez créé une)
        const res = await api.get('/agent/dashboard');
        if (res.data.success) {
            setProperties(res.data.managedProperties || []);
        }
      } catch (error) {
        console.error("Erreur chargement biens", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  if (loading) return (
    <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Biens sous Gestion</h1>
        <p className="text-slate-400 mt-1">Liste des propriétés dont vous êtes le gestionnaire mandaté.</p>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl">
            <Home className="w-12 h-12 text-slate-600 mx-auto mb-4"/>
            <p className="text-slate-400 font-bold">Aucun bien en gestion</p>
            <p className="text-slate-600 text-sm mt-1">Acceptez des missions pour convertir des propriétaires !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
                <div key={property.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group hover:border-orange-500/50 transition-all">
                    
                    {/* Image (Placeholder si pas d'image) */}
                    <div className="h-48 bg-slate-800 relative">
                         <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                            <Home className="w-10 h-10 opacity-20"/>
                         </div>
                         <div className="absolute top-3 right-3">
                            <Badge className={property.isAvailable ? "bg-emerald-500 text-black" : "bg-red-500 text-white"}>
                                {property.isAvailable ? "Disponible" : "Loué"}
                            </Badge>
                         </div>
                    </div>

                    <div className="p-5">
                        <h3 className="font-bold text-white text-lg truncate mb-1">{property.title}</h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1 mb-4">
                            <MapPin className="w-3 h-3 text-slate-500"/> {property.address}
                        </p>

                        {/* Info Propriétaire */}
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 mb-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-400"/>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Propriétaire</p>
                                <p className="text-sm font-bold text-white">{property.owner?.name}</p>
                            </div>
                        </div>

                        <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-9">
                            VOIR LE DOSSIER
                        </Button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
