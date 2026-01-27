"use client";

import { Phone, Wrench, Plus, MapPin, BadgeCheck } from "lucide-react";
// ✅ Import Prisma pour être cohérent
import { User } from "@prisma/client";

// On étend User car Prisma n'a pas forcément 'location' ou 'job' natifs si ce n'est pas dans le schéma
// Mais on suppose ici que 'jobTitle' et 'address' font l'affaire.
interface ArtisanUser extends User {
  jobTitle: string | null;
  address: string | null;
}

interface ArtisansListProps {
  artisans: ArtisanUser[];
  onAddArtisan: () => void;
}

export default function ArtisansList({ artisans, onAddArtisan }: ArtisansListProps) {

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl text-slate-900 mt-8 h-full">
        
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" /> Artisans Agréés
            </h3>
            <button 
                onClick={onAddArtisan}
                className="text-blue-500 text-sm font-bold hover:text-blue-600 transition bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 active:scale-95"
            >
                <Plus className="w-4 h-4" /> Ajouter
            </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {artisans && artisans.length > 0 ? artisans.map((art) => (
                <div key={art.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl group hover:border-orange-200 hover:bg-white hover:shadow-lg transition">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 group-hover:text-orange-500 transition line-clamp-1">{art.name}</h4>
                        {/* kycStatus 'VERIFIED' remplace isVerified */}
                        {art.kycStatus === 'VERIFIED' && (
                             <span className="bg-green-100 text-green-600 text-[9px] px-2 py-0.5 rounded-full uppercase font-bold flex items-center gap-1 shrink-0">
                                <BadgeCheck className="w-3 h-3" /> Vérifié
                             </span>
                        )}
                    </div>
                    
                    <p className="text-orange-500 text-xs font-bold uppercase tracking-wide mb-1">{art.jobTitle || "Artisan"}</p>
                    <p className="text-slate-500 text-[10px] mb-4 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {art.address || "Abidjan"}
                    </p>
                    
                    <a 
                        href={`tel:${art.phone}`} 
                        className="flex items-center justify-center gap-2 w-full bg-white border border-slate-200 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition"
                    >
                        <Phone className="w-3 h-3" /> Appeler
                    </a>
                </div>
            )) : (
                <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <p className="text-4xl mb-2">👨‍🔧</p>
                    <p className="text-slate-400 font-medium mb-4 text-sm">Aucun artisan partenaire</p>
                    <button onClick={onAddArtisan} className="text-blue-500 font-bold hover:underline text-sm">
                        + Ajouter mon premier artisan
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}
