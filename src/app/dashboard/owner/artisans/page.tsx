"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Plus, Search, Phone, MapPin, Star, 
  Wrench, Hammer, Paintbrush, Key, HardHat, Zap, Loader2, LucideIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// --- TYPAGE STRICT ---
interface Artisan {
  id: string;
  name: string;
  job: string;
  phone: string;
  location: string;
  email: string | null;
  rating: number;
}

interface JobConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
}

// Configuration visuelle par métier
const JOB_ICONS: Record<string, JobConfig> = {
  PLOMBIER: { icon: Wrench, color: "text-blue-400", bg: "bg-blue-400/10" },
  ELECTRICIEN: { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  PEINTRE: { icon: Paintbrush, color: "text-pink-400", bg: "bg-pink-400/10" },
  SERRURIER: { icon: Key, color: "text-gray-400", bg: "bg-gray-400/10" },
  MACON: { icon: HardHat, color: "text-orange-400", bg: "bg-orange-400/10" },
  AUTRE: { icon: Hammer, color: "text-emerald-400", bg: "bg-emerald-400/10" },
};

export default function ArtisansListPage() {
  const router = useRouter();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // CHARGEMENT (ZERO TRUST)
  useEffect(() => {
    const fetchArtisans = async () => {
      try {
        // ✅ APPEL SÉCURISÉ : Cookie Only
        const res = await api.get('/owner/artisans'); 
        if (res.data.success) {
          setArtisans(res.data.artisans);
        }
      } catch (error: any) {
        console.error("Erreur chargement artisans", error);
        if (error.response?.status === 401) {
             router.push('/login');
        } else {
             toast.error("Impossible de charger l'annuaire.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchArtisans();
  }, [router]);

  // Filtrage local
  const filteredArtisans = artisans.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.job.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 font-sans pb-20">
      
      {/* EN-TÊTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
            <HardHat className="text-orange-500 w-8 h-8" /> Mes Artisans
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gérez votre réseau de partenaires de confiance.
          </p>
        </div>

        <Link 
          href="/dashboard/owner/artisans/add" 
          className="bg-orange-500 hover:bg-orange-400 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-orange-500/20 active:scale-95 uppercase text-xs tracking-wider"
        >
          <Plus className="w-5 h-5" /> Nouveau Contact
        </Link>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="relative mb-10 max-w-md">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
        <input 
          type="text" 
          placeholder="Rechercher un plombier, un nom..." 
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition placeholder:text-slate-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LISTE (GRILLE) */}
      {loading ? (
        <div className="flex justify-center py-32">
            <Loader2 className="animate-spin w-12 h-12 text-orange-500" />
        </div>
      ) : filteredArtisans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredArtisans.map((artisan) => {
            // Fallback sur "AUTRE" si le métier n'est pas reconnu
            const jobKey = artisan.job.toUpperCase();
            const style = JOB_ICONS[jobKey] || JOB_ICONS.AUTRE;
            const Icon = style.icon;

            return (
              <div key={artisan.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-orange-500/30 transition duration-300 group relative overflow-hidden shadow-xl">
                
                {/* DÉCORATION D'ARRIÈRE-PLAN */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${style.bg} rounded-bl-full -mr-6 -mt-6 opacity-20 transition group-hover:scale-110 group-hover:opacity-30`}></div>

                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl ${style.bg} flex items-center justify-center border border-white/5 shadow-inner`}>
                    <Icon className={`w-7 h-7 ${style.color}`} />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 truncate">{artisan.name}</h3>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 ${style.color}`}>
                  {artisan.job}
                </span>

                <div className="mt-8 space-y-4">
                  <a href={`tel:${artisan.phone}`} className="flex items-center gap-3 text-slate-400 hover:text-white transition group/link bg-black/20 p-3 rounded-xl border border-transparent hover:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover/link:bg-orange-500 group-hover/link:text-black transition shrink-0">
                        <Phone className="w-4 h-4" />
                    </div>
                    <span className="font-mono font-bold tracking-wide">{artisan.phone}</span>
                  </a>
                  
                  <div className="flex items-center gap-3 text-slate-500 px-3">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium truncate">{artisan.location || "Abidjan, Côte d'Ivoire"}</span>
                  </div>
                </div>

                {/* FOOTER CARTE */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-white text-xs">{artisan.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        Disponible
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ETAT VIDE */
        <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[3rem]">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700">
            <HardHat className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Votre carnet est vide</h3>
          <p className="text-slate-500 max-w-md text-center text-sm mb-8">
            Ajoutez des plombiers, électriciens ou peintres pour intervenir rapidement en cas d'incident.
          </p>
          <Link 
            href="/dashboard/owner/artisans/add" 
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-white hover:text-black text-white px-6 py-3 rounded-xl font-bold transition shadow-lg"
          >
            <Plus className="w-4 h-4" /> Ajouter mon premier artisan
          </Link>
        </div>
      )}
    </div>
  );
}
