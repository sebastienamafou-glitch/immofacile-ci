"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, Home, MapPin, User, MessageCircle, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

// Typage strict pour éviter les erreurs TypeScript
interface ManagedProperty {
  id: string;
  title: string;
  address: string;
  price: number;
  images: string[];
  type: string;
  isAvailable: boolean;
  owner: {
    name: string | null;
    phone: string | null;
    email: string;
  };
}

export default function AgentPropertiesPage() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<ManagedProperty[]>([]);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        // ✅ On appelle notre nouvelle route dédiée
        const res = await api.get('/agent/properties');
        if (res.data.success) {
            setProperties(res.data.properties);
        }
      } catch (error) {
        console.error("Erreur chargement biens", error);
        toast.error("Impossible de charger vos biens.");
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  if (loading) return (
    <div className="h-[80vh] w-full flex flex-col items-center justify-center bg-[#060B18]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="text-slate-500 text-sm mt-4">Récupération de votre portefeuille...</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen bg-[#060B18] pb-20">
      
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Biens sous Gestion</h1>
            <p className="text-slate-400 mt-1">
                Vous gérez actuellement <span className="text-emerald-400 font-bold">{properties.length}</span> propriétés.
            </p>
        </div>
        <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 flex items-center gap-3">
             <Building2 className="w-5 h-5 text-emerald-500" />
             <span className="text-emerald-400 font-bold text-sm">Portefeuille Actif</span>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-24 bg-slate-900/30 border border-slate-800 border-dashed rounded-3xl animate-in fade-in zoom-in duration-500">
            <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500 shadow-xl shadow-black/20">
                <Home className="w-10 h-10 opacity-50"/>
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Aucun bien attribué</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
                Acceptez des missions "État des lieux" ou "Visite" pour que les biens apparaissent automatiquement dans votre portefeuille.
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {properties.map((property) => (
                <Card key={property.id} className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden group hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-900/20">
                    
                    {/* Zone Image */}
                    <div className="h-48 bg-slate-800 relative overflow-hidden">
                         {property.images && property.images.length > 0 ? (
                            <img 
                                src={property.images[0]} 
                                alt={property.title} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                         ) : (
                             <div className="absolute inset-0 flex items-center justify-center text-slate-700 bg-slate-800">
                                <Home className="w-12 h-12 opacity-20"/>
                             </div>
                         )}
                         
                         {/* Badge Statut */}
                         <div className="absolute top-3 right-3">
                            <Badge className={`${property.isAvailable ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-red-500 text-white hover:bg-red-600"} font-bold border-0 shadow-lg`}>
                                {property.isAvailable ? "Disponible" : "Loué"}
                            </Badge>
                         </div>
                         
                         {/* Badge Type */}
                         <div className="absolute bottom-3 left-3">
                            <Badge variant="outline" className="bg-black/60 backdrop-blur border-white/20 text-white text-xs">
                                {property.type}
                            </Badge>
                         </div>
                    </div>

                    <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-white text-lg truncate flex-1 mr-2">{property.title}</h3>
                            <span className="text-emerald-400 font-bold text-sm">{property.price.toLocaleString()} F</span>
                        </div>
                        
                        <p className="text-slate-400 text-sm flex items-center gap-1 mb-6 truncate">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0"/> {property.address}
                        </p>

                        {/* Bloc Propriétaire */}
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex items-center justify-between group-hover:border-emerald-500/20 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                    <User className="w-4 h-4 text-slate-400"/>
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Propriétaire</p>
                                    <p className="text-xs font-bold text-white truncate max-w-[100px]">{property.owner.name || "Anonyme"}</p>
                                </div>
                            </div>
                            
                            {property.owner.phone && (
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full"
                                    onClick={() => window.open(`https://wa.me/${property.owner.phone}`, '_blank')}
                                    title="Contacter sur WhatsApp"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}
