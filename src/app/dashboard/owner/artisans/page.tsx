"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Plus, Search, Phone, MapPin, Star, ShieldCheck,
  Wrench, Hammer, Paintbrush, Key, HardHat, Zap, Loader2, 
  LucideIcon, User, CheckCircle2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

// --- 1. TYPAGE STRICT (Conforme Schema Prisma User) ---
interface Artisan {
  id: string;
  name: string;
  jobTitle: string; // ✅ Renommé pour coller au schema (was 'job')
  phone: string;
  address: string | null; // ✅ Renommé pour coller au schema (was 'location')
  email: string | null;
  image: string | null; // ✅ Ajout support photo de profil
  isVerified: boolean;  // ✅ Ajout badge de certification
  rating?: number;      // Optionnel (non présent dans schema User, souvent calculé)
}

interface JobConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

// --- 2. CONFIGURATION VISUELLE ---
const JOB_STYLES: Record<string, JobConfig> = {
  PLOMBIER: { icon: Wrench, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  ELECTRICIEN: { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  PEINTRE: { icon: Paintbrush, color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
  SERRURIER: { icon: Key, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" },
  MACON: { icon: HardHat, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  DEFAULT: { icon: Hammer, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
};

export default function ArtisansListPage() {
  const router = useRouter();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 3. CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    const fetchArtisans = async () => {
      try {
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
    (a.jobTitle || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B1120] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1120] to-[#0B1120] text-slate-200 p-6 lg:p-10 font-sans pb-32">
      
      {/* EN-TÊTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 animate-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
            <span className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20">
                <HardHat className="text-orange-500 w-6 h-6" />
            </span>
            Mes Artisans
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">
            Gérez votre réseau d'experts pour la maintenance de vos biens.
          </p>
        </div>

        <Link 
          href="/dashboard/owner/artisans/add" 
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black px-6 py-3 rounded-xl font-black flex items-center gap-2 transition shadow-lg shadow-orange-500/20 active:scale-95 uppercase text-xs tracking-wider"
        >
          <Plus className="w-4 h-4" /> Ajouter un Artisan
        </Link>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="relative mb-12 max-w-lg">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-500" />
        </div>
        <input 
          type="text" 
          placeholder="Rechercher par nom, métier (ex: Plombier)..." 
          className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition placeholder:text-slate-600 backdrop-blur-xl shadow-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* CONTENU PRINCIPAL */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="animate-spin w-12 h-12 text-orange-500" />
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Chargement de l'annuaire...</p>
        </div>
      ) : filteredArtisans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-700">
          {filteredArtisans.map((artisan) => {
            // Détermination du style selon le jobTitle
            const jobKey = artisan.jobTitle ? artisan.jobTitle.toUpperCase().split(' ')[0] : "AUTRE";
            // Recherche de correspondance partielle (ex: "MAÎTRE MACON" -> "MACON")
            const styleKey = Object.keys(JOB_STYLES).find(k => jobKey.includes(k)) || "DEFAULT";
            const style = JOB_STYLES[styleKey];
            const Icon = style.icon;

            return (
              <div key={artisan.id} className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 hover:bg-slate-800/40 hover:border-white/10 transition-all duration-300 group relative overflow-hidden backdrop-blur-md shadow-2xl">
                
                {/* Effet visuel background */}
                <div className={`absolute -top-10 -right-10 w-40 h-40 ${style.bg} rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity`}></div>

                {/* Header Carte */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl ${style.bg} ${style.border} flex items-center justify-center border shadow-inner text-white`}>
                    {artisan.image ? (
                        <img src={artisan.image} alt={artisan.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                        <Icon className={`w-7 h-7 ${style.color}`} />
                    )}
                  </div>
                  
                  {artisan.isVerified && (
                      <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">
                          <ShieldCheck className="w-3 h-3 text-blue-400" />
                          <span className="text-[10px] font-bold text-blue-400 uppercase">Vérifié</span>
                      </div>
                  )}
                </div>

                {/* Infos Artisan */}
                <h3 className="text-xl font-bold text-white mb-1 truncate">{artisan.name}</h3>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-6 ${style.color}`}>
                  {artisan.jobTitle || "Artisan Polyvalent"}
                </p>

                {/* Détails Contact */}
                <div className="space-y-3 mb-8">
                  <a href={`tel:${artisan.phone}`} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5 hover:border-white/10 transition group/link">
                    <span className="font-mono font-bold text-slate-300 tracking-wide">{artisan.phone}</span>
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover/link:bg-emerald-500 group-hover/link:text-black transition">
                        <Phone className="w-4 h-4" />
                    </div>
                  </a>
                  
                  <div className="flex items-center gap-3 text-slate-500 px-2">
                    <MapPin className="w-4 h-4 shrink-0 text-slate-600" />
                    <span className="text-xs font-medium truncate">{artisan.address || "Zone: Abidjan & Banlieue"}</span>
                  </div>
                </div>

                {/* Footer Carte */}
                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-white text-sm">{artisan.rating ? artisan.rating.toFixed(1) : "5.0"}</span>
                        <span className="text-xs text-slate-600 ml-1">(Nouveau)</span>
                    </div>
                    
                    <button onClick={() => router.push(`/dashboard/owner/artisans/${artisan.id}`)} className="text-xs font-bold text-slate-400 hover:text-white transition">
                        Voir Profil &rarr;
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ÉTAT VIDE */
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="relative mb-6">
              <div className="absolute inset-0 bg-orange-500 blur-[60px] opacity-10 rounded-full"></div>
              <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center relative z-10 shadow-2xl">
                <HardHat className="w-10 h-10 text-slate-600" />
              </div>
          </div>
          
          <h3 className="text-2xl font-black text-white mb-3 text-center">Votre carnet est vide</h3>
          <p className="text-slate-400 max-w-md text-center text-sm mb-8 leading-relaxed">
            Ajoutez dès maintenant vos plombiers, électriciens et peintres favoris pour intervenir rapidement sur vos incidents.
          </p>
          
          <Link 
            href="/dashboard/owner/artisans/add" 
            className="group flex items-center gap-3 bg-slate-100 hover:bg-white text-slate-900 px-8 py-4 rounded-2xl font-black transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> 
            Ajouter mon premier artisan
          </Link>
        </div>
      )}
    </div>
  );
}
