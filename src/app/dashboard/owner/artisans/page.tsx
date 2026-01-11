"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Plus, Search, Phone, MapPin, Star, MoreVertical, 
  Wrench, Hammer, Paintbrush, Key, HardHat, Zap, Trash2, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";

// Mapping des icônes par métier
const JOB_ICONS: any = {
  PLOMBIER: { icon: Wrench, color: "text-blue-400", bg: "bg-blue-400/10" },
  ELECTRICIEN: { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  PEINTRE: { icon: Paintbrush, color: "text-pink-400", bg: "bg-pink-400/10" },
  SERRURIER: { icon: Key, color: "text-gray-400", bg: "bg-gray-400/10" },
  MACON: { icon: HardHat, color: "text-orange-400", bg: "bg-orange-400/10" },
  AUTRE: { icon: Hammer, color: "text-emerald-400", bg: "bg-emerald-400/10" },
};

export default function ArtisansListPage() {
  const router = useRouter();
  const [artisans, setArtisans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Récupération des données au chargement
  useEffect(() => {
    const fetchArtisans = async () => {
      try {
        const res = await api.get('/owner/artisans'); 
        if (res.data.success) {
          setArtisans(res.data.artisans);
        }
      } catch (error) {
        console.error("Erreur chargement artisans", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArtisans();
  }, []);

  // Filtrage
  const filteredArtisans = artisans.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.job.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 font-sans">
      
      {/* EN-TÊTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase italic">
            <HardHat className="text-orange-500 w-8 h-8" /> Mes Artisans
          </h1>
          <p className="text-slate-500 text-sm font-bold mt-1">
            Gérez votre réseau de partenaires de confiance
          </p>
        </div>

        <Link 
          href="/dashboard/owner/artisans/add" 
          className="bg-orange-500 hover:bg-orange-600 text-black px-6 py-3 rounded-xl font-black flex items-center gap-2 transition shadow-lg shadow-orange-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" /> NOUVEAU CONTACT
        </Link>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="relative mb-10 max-w-md">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
        <input 
          type="text" 
          placeholder="Rechercher un plombier, un nom..." 
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none transition"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LISTE (GRILLE) */}
      {loading ? (
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin w-10 h-10 text-orange-500" />
        </div>
      ) : filteredArtisans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredArtisans.map((artisan) => {
            const style = JOB_ICONS[artisan.job] || JOB_ICONS.AUTRE;
            const Icon = style.icon;

            return (
              <div key={artisan.id} className="bg-slate-900 border border-white/5 rounded-2xl p-6 hover:border-slate-700 transition group relative overflow-hidden">
                
                {/* Fond coloré subtil */}
                <div className={`absolute top-0 right-0 w-24 h-24 ${style.bg} rounded-bl-full -mr-4 -mt-4 opacity-50 transition group-hover:scale-110`}></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`w-12 h-12 rounded-xl ${style.bg} flex items-center justify-center border border-white/5`}>
                    <Icon className={`w-6 h-6 ${style.color}`} />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{artisan.name}</h3>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-slate-950 border border-slate-800 ${style.color}`}>
                  {artisan.job}
                </span>

                <div className="mt-6 space-y-3">
                  <a href={`tel:${artisan.phone}`} className="flex items-center gap-3 text-slate-400 hover:text-orange-500 transition group/link">
                    <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center group-hover/link:bg-orange-500 group-hover/link:text-black transition">
                        <Phone className="w-4 h-4" />
                    </div>
                    <span className="font-mono font-medium">{artisan.phone}</span>
                  </a>
                  
                  <div className="flex items-center gap-3 text-slate-400">
                    <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-sm">{artisan.location || "Abidjan"}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-white">{artisan.rating || "5.0"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        Disponible
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ETAT VIDE */
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <HardHat className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Votre carnet est vide</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Ajoutez des plombiers, électriciens ou peintres pour pouvoir les assigner rapidement en cas d'incident.
          </p>
          <Link 
            href="/dashboard/owner/artisans/add" 
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold transition"
          >
            <Plus className="w-4 h-4" /> Ajouter mon premier artisan
          </Link>
        </div>
      )}
    </div>
  );
}
