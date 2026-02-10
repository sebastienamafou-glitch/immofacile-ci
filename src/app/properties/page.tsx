"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Search, MapPin, BedDouble, Bath, Square, Loader2, 
  Menu, X, Palmtree, Building2, Filter
} from "lucide-react";
import { api } from "@/lib/api"; 

// --- TYPES ---
interface PublicProperty {
  id: string;
  title: string;
  price: number;
  commune: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  surface: number;
  images: string[];
}

export default function PropertiesPage() {
  // --- STATES ---
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [loading, setLoading] = useState(true);
  // Ajout de 'maxPrice' au state si vous voulez l'implémenter plus tard
  const [filters, setFilters] = useState({ type: "", commune: "", maxPrice: "" });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- FETCH DATA (ROBUSTE & SÉCURISÉ) ---
  useEffect(() => {
    const fetchProps = async () => {
      setLoading(true);
      try {
        // Construction propre des paramètres URL
        const params = new URLSearchParams();
        if (filters.type) params.append("type", filters.type);
        if (filters.commune) params.append("commune", filters.commune);
        // if (filters.maxPrice) params.append("maxPrice", filters.maxPrice); 
        
        const res = await api.get(`/public/properties?${params.toString()}`);
        
        // --- LOGIQUE DE RÉCUPÉRATION SÉCURISÉE ---
        // On gère tous les formats possibles de l'API pour éviter le crash .map()
        const responseBody = res.data;

        if (responseBody && Array.isArray(responseBody.data)) {
            // Format standard : { success: true, data: [...] }
            setProperties(responseBody.data);
        } else if (Array.isArray(responseBody)) {
            // Format fallback : [...]
            setProperties(responseBody);
        } else {
            console.warn("Format API inattendu, initialisation tableau vide.", responseBody);
            setProperties([]);
        }

      } catch (e) {
        console.error("Erreur chargement properties:", e);
        setProperties([]); // Fallback sécurisé
      } finally {
        setLoading(false);
      }
    };

    // Debounce pour éviter de spammer l'API quand on tape vite
    const timer = setTimeout(fetchProps, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const formatPrice = (p: number) => p.toLocaleString('fr-FR') + ' FCFA';
  
  // Array.isArray est redondant grâce au try/catch mais c'est une sécurité ultime pour le rendu
  const safeProperties = Array.isArray(properties) ? properties : [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      {/* ==================================================================
          1. NAVBAR (RESPONSIVE)
      ================================================================== */}
      <nav className="fixed top-0 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200 z-50 h-20 flex items-center shadow-sm">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            
            {/* LOGO */}
            <Link href="/" className="flex items-center gap-2 group">
                <div className="relative w-10 h-10 transition-transform group-hover:scale-105">
                   <Image src="/logo.png" alt="ImmoFacile" width={40} height={40} className="object-contain" priority />
                </div>
                <span className="font-black text-xl tracking-tight text-[#0B1120] hidden md:block">
                    ImmoFacile<span className="text-orange-500">.CI</span>
                </span>
            </Link>

            {/* DESKTOP LINKS */}
            <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600">
                <Link href="/" className="hover:text-orange-500 transition duration-200">Accueil</Link>
                <Link href="/properties" className="text-orange-600 font-bold border-b-2 border-orange-500 pb-1">Longue Durée</Link>
                <Link href="/akwaba" className="hover:text-emerald-600 transition duration-200 flex items-center gap-1">
                    <Palmtree className="w-4 h-4" /> Séjours (Akwaba)
                </Link>
            </div>

            {/* ACTION BUTTONS (DESKTOP) */}
            <div className="hidden md:flex items-center gap-4">
                <Link href="/login" className="text-sm font-bold text-slate-900 hover:text-orange-500 transition">
                    Se connecter
                </Link>
                <Link href="/dashboard/owner/properties/add" className="bg-[#0B1120] hover:bg-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-bold transition shadow-lg hover:shadow-orange-500/20">
                    Publier un bien
                </Link>
            </div>

            {/* MOBILE TOGGLE */}
            <button 
                className="md:hidden p-2 text-slate-800 hover:bg-slate-100 rounded-full transition" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menu"
            >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-40 bg-white p-6 md:hidden flex flex-col gap-6 animate-in slide-in-from-top-5 duration-200 shadow-xl">
            <div className="space-y-4">
                <Link href="/" className="block text-xl font-bold text-slate-800 hover:text-orange-500" onClick={() => setIsMobileMenuOpen(false)}>Accueil</Link>
                <Link href="/properties" className="block text-xl font-bold text-orange-600" onClick={() => setIsMobileMenuOpen(false)}>Longue Durée</Link>
                <Link href="/akwaba" className="block text-xl font-bold text-emerald-600" onClick={() => setIsMobileMenuOpen(false)}>Séjours (Akwaba)</Link>
            </div>
            <hr className="border-slate-100" />
            <div className="flex flex-col gap-3">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full bg-slate-100 py-3 rounded-xl text-center font-bold text-slate-900 hover:bg-slate-200 transition">Se connecter</Link>
                <Link href="/dashboard/owner/properties/add" onClick={() => setIsMobileMenuOpen(false)} className="w-full bg-orange-500 text-white py-3 rounded-xl text-center font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/20">Publier un bien</Link>
            </div>
        </div>
      )}

      {/* ==================================================================
          2. HERO SEARCH SECTION (MOBILE OPTIMIZED)
      ================================================================== */}
      <div className="bg-[#0B1120] pt-32 pb-16 px-4 relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
            
            {/* Onglets Navigation Hero */}
            <div className="inline-flex bg-white/10 p-1 rounded-full mb-8 backdrop-blur-md border border-white/10 shadow-xl">
                <button className="px-4 sm:px-6 py-2 rounded-full bg-orange-500 text-white font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> <span className="hidden xs:inline">Louer</span> (Longue Durée)
                </button>
                <Link href="/akwaba" className="px-4 sm:px-6 py-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 font-bold text-xs sm:text-sm transition flex items-center gap-2">
                    <Palmtree className="w-4 h-4" /> <span className="hidden xs:inline">Séjourner</span> (Akwaba)
                </Link>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
                Trouvez votre nouveau <br className="hidden sm:block"/> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">chez-vous en Côte d'Ivoire.</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-2xl mx-auto px-4">
                Des milliers de villas et appartements vérifiés. Contrats digitalisés et sécurité garantie.
            </p>
            
            {/* SEARCH BAR WIDGET */}
            <div className="bg-white p-2 rounded-2xl shadow-2xl shadow-black/30 flex flex-col md:flex-row gap-2 max-w-3xl mx-auto">
                {/* Input Commune */}
                <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-transparent hover:border-slate-200 focus-within:border-orange-500 transition group">
                    <MapPin className="text-slate-400 w-5 h-5 group-focus-within:text-orange-500 flex-shrink-0" />
                    <input 
                        type="text" 
                        placeholder="Commune (ex: Cocody)" 
                        className="bg-transparent outline-none w-full text-sm font-bold text-slate-900 placeholder:text-slate-400"
                        value={filters.commune}
                        onChange={(e) => setFilters({...filters, commune: e.target.value})}
                    />
                </div>

                {/* Select Type */}
                <div className="w-full md:w-64 bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-transparent hover:border-slate-200 focus-within:border-orange-500 transition group">
                    <Filter className="text-slate-400 w-5 h-5 group-focus-within:text-orange-500 flex-shrink-0" />
                    <select 
                        className="bg-transparent outline-none w-full text-sm font-bold text-slate-900 cursor-pointer appearance-none truncate"
                        value={filters.type}
                        onChange={(e) => setFilters({...filters, type: e.target.value})}
                    >
                        <option value="">Tous types</option>
                        <option value="APPARTEMENT">Appartement</option>
                        <option value="VILLA">Villa</option>
                        <option value="STUDIO">Studio</option>
                        <option value="BUREAU">Bureau</option>
                        <option value="MAGASIN">Magasin</option>
                        <option value="TERRAIN">Terrain</option>
                    </select>
                </div>

                {/* Search Button */}
                <button className="bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold px-8 py-3 rounded-xl transition shadow-lg shadow-orange-500/20 whitespace-nowrap flex items-center justify-center gap-2">
                    <Search className="w-5 h-5 md:hidden" />
                    <span>Rechercher</span>
                </button>
            </div>
        </div>
      </div>

      {/* ==================================================================
          3. RESULT GRID
      ================================================================== */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
            <div className="flex flex-col items-center justify-center py-32 opacity-60">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse text-lg">Recherche des meilleures offres...</p>
            </div>
        ) : (
            <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 border-b border-slate-200 pb-4 gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{safeProperties.length} Résultats</h2>
                        <p className="text-slate-500 text-sm mt-1">Biens en gestion exclusive ImmoFacile</p>
                    </div>
                </div>

                {/* GRILLE RESPONSIVE : 1 col mobile, 2 cols tablette, 3 cols desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {safeProperties.map((prop) => (
                        <Link 
                            href={`/properties/${prop.id}`} 
                            key={prop.id} 
                            className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 transition duration-300 flex flex-col h-full"
                        >
                            {/* IMAGE CONTAINER */}
                            <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                                {prop.images && prop.images[0] ? (
                                    <Image 
                                        src={prop.images[0]} 
                                        alt={prop.title} 
                                        fill 
                                        // ✅ OPTIMISATION IMAGE RESPONSIVE
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover group-hover:scale-110 transition duration-700" 
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 font-medium text-sm flex-col gap-2">
                                        <Building2 className="w-8 h-8 opacity-20" />
                                        <span>Image indisponible</span>
                                    </div>
                                )}
                                
                                {/* BADGES */}
                                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 border border-slate-100 shadow-sm">
                                    {prop.type}
                                </div>
                                <div className="absolute bottom-4 right-4 bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-orange-900/20">
                                    {formatPrice(prop.price)} <span className="text-[10px] font-normal opacity-80">/mois</span>
                                </div>
                            </div>

                            {/* CARD CONTENT */}
                            <div className="p-5 flex flex-col flex-grow">
                                <div className="flex items-center gap-1.5 text-orange-600 text-[11px] font-bold uppercase tracking-wider mb-2">
                                    <MapPin className="w-3.5 h-3.5" /> {prop.commune}
                                </div>
                                
                                <h3 className="text-lg font-bold text-slate-900 mb-4 line-clamp-2 group-hover:text-orange-600 transition" title={prop.title}>
                                    {prop.title}
                                </h3>

                                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-slate-500 text-xs font-bold">
                                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md" title={`${prop.bedrooms} Chambres`}>
                                        <BedDouble className="w-4 h-4 text-slate-400"/> {prop.bedrooms} <span className="hidden xs:inline">Ch.</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md" title={`${prop.bathrooms} Salles d'eau`}>
                                        <Bath className="w-4 h-4 text-slate-400"/> {prop.bathrooms} <span className="hidden xs:inline">Douches</span>
                                    </span>
                                    {prop.surface && (
                                        <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md">
                                            <Square className="w-4 h-4 text-slate-400"/> {prop.surface} m²
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* EMPTY STATE */}
                {safeProperties.length === 0 && (
                    <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm mx-auto max-w-md">
                        <div className="inline-block p-4 bg-orange-50 rounded-full mb-6">
                            <Search className="w-10 h-10 text-orange-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun bien trouvé</h3>
                        <p className="text-slate-500 px-6 leading-relaxed">
                            Nous n'avons pas trouvé de résultat pour cette recherche. Essayez d'élargir la zone géographique ou de changer le type de bien.
                        </p>
                        <button 
                            onClick={() => setFilters({ type: "", commune: "", maxPrice: "" })} 
                            className="mt-8 text-orange-600 font-bold hover:text-orange-700 hover:underline transition"
                        >
                            Réinitialiser tous les filtres
                        </button>
                    </div>
                )}
            </>
        )}
      </main>

      {/* FOOTER SIMPLE */}
      <footer className="bg-[#0B1120] text-slate-400 py-12 border-t border-slate-800">
         <div className="max-w-7xl mx-auto px-4 text-center">
             <Image src="/logo.png" alt="Logo" width={30} height={30} className="mx-auto mb-4 opacity-50 grayscale" />
             <p className="text-xs font-medium text-slate-500">&copy; {new Date().getFullYear()} ImmoFacile CI. Gestion Locative & Réservations.</p>
         </div>
      </footer>

    </div>
  );
}
