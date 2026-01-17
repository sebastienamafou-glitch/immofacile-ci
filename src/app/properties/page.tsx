"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Search, MapPin, BedDouble, Bath, Square, Loader2, 
  Menu, X, Phone, Mail, Facebook, Instagram, Linkedin 
} from "lucide-react";
import { api } from "@/lib/api"; 
import { Button } from "@/components/ui/button"; // Assurez-vous d'avoir ce composant ou utilisez html button standard

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
  const [filters, setFilters] = useState({ type: "", commune: "", maxPrice: "" });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchProps = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.type) params.append("type", filters.type);
        if (filters.commune) params.append("commune", filters.commune);
        
        const res = await api.get(`/public/properties?${params.toString()}`);
        setProperties(res.data);
      } catch (e) {
        console.error("Erreur chargement", e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchProps, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const formatPrice = (p: number) => p.toLocaleString('fr-FR') + ' FCFA';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      {/* ==================================================================
          1. NAVBAR (NAVIGATION PRINCIPALE)
      ================================================================== */}
      <nav className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 z-50 h-20 flex items-center">
        <div className="max-w-7xl w-full mx-auto px-4 flex justify-between items-center">
            
            {/* LOGO */}
            <Link href="/" className="flex items-center gap-2">
                <div className="relative w-10 h-10">
                    <Image src="/logo.png" alt="ImmoFacile" fill className="object-contain" />
                </div>
                <span className="font-black text-xl tracking-tight text-[#0B1120] hidden md:block">
                    ImmoFacile<span className="text-orange-500">.CI</span>
                </span>
            </Link>

            {/* DESKTOP LINKS */}
            <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600">
                <Link href="/" className="hover:text-orange-500 transition">Accueil</Link>
                <Link href="/properties" className="text-orange-600 font-bold">Nos Annonces</Link>
                <Link href="/terms" className="hover:text-orange-500 transition">CGU & Mentions</Link>
            </div>

            {/* ACTION BUTTONS */}
            <div className="hidden md:flex items-center gap-4">
                <Link href="/login" className="text-sm font-bold text-slate-900 hover:text-orange-500 transition">
                    Se connecter
                </Link>
                <Link href="/signup" className="bg-[#0B1120] hover:bg-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-bold transition shadow-lg">
                    Publier un bien
                </Link>
            </div>

            {/* MOBILE MENU TOGGLE */}
            <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-40 bg-white p-6 md:hidden flex flex-col gap-6">
            <Link href="/" className="text-xl font-bold">Accueil</Link>
            <Link href="/properties" className="text-xl font-bold text-orange-500">Annonces</Link>
            <Link href="/terms" className="text-xl font-bold">Mentions Légales</Link>
            <hr />
            <Link href="/login" className="w-full bg-slate-100 py-3 rounded-xl text-center font-bold">Se connecter</Link>
            <Link href="/signup" className="w-full bg-orange-500 text-white py-3 rounded-xl text-center font-bold">Créer un compte</Link>
        </div>
      )}

      {/* ==================================================================
          2. HERO SEARCH SECTION
      ================================================================== */}
      <div className="bg-[#0B1120] pt-40 pb-20 px-4 relative overflow-hidden">
        {/* Background Elements decoratifs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">
                La référence de la location <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">sécurisée en Côte d'Ivoire.</span>
            </h1>
            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
                Accédez à des centaines de biens vérifiés. Visitez, postulez et signez votre bail en ligne. Sans déplacement inutile.
            </p>
            
            {/* SEARCH BAR AVANCÉE */}
            <div className="bg-white p-2 rounded-2xl shadow-2xl shadow-black/20 flex flex-col md:flex-row gap-2">
                <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-transparent hover:border-slate-200 focus-within:border-orange-500 transition group">
                    <MapPin className="text-slate-400 w-5 h-5 group-focus-within:text-orange-500" />
                    <input 
                        type="text" 
                        placeholder="Quelle commune ? (ex: Cocody)" 
                        className="bg-transparent outline-none w-full text-sm font-bold text-slate-900 placeholder:text-slate-400"
                        value={filters.commune}
                        onChange={(e) => setFilters({...filters, commune: e.target.value})}
                    />
                </div>
                <div className="w-full md:w-64 bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-transparent hover:border-slate-200">
                    <Search className="text-slate-400 w-5 h-5" />
                    <select 
                        className="bg-transparent outline-none w-full text-sm font-bold text-slate-900 cursor-pointer appearance-none"
                        value={filters.type}
                        onChange={(e) => setFilters({...filters, type: e.target.value})}
                    >
                        <option value="">Tous types de biens</option>
                        <option value="APPARTEMENT">Appartement</option>
                        <option value="VILLA">Villa</option>
                        <option value="STUDIO">Studio</option>
                        <option value="BUREAU">Bureau</option>
                    </select>
                </div>
                <button className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 py-3 rounded-xl transition shadow-lg shadow-orange-500/20 whitespace-nowrap">
                    Rechercher
                </button>
            </div>
        </div>
      </div>

      {/* ==================================================================
          3. RESULT GRID
      ================================================================== */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-12">
        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Recherche des meilleures offres...</p>
            </div>
        ) : (
            <>
                <div className="flex justify-between items-end mb-8 border-b border-slate-200 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{properties.length} Résultats</h2>
                        <p className="text-slate-500 text-sm">Biens disponibles immédiatement</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {properties.map((prop) => (
                        <Link href={`/properties/public/${prop.id}`} key={prop.id} className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 transition duration-300">
                            {/* Image */}
                            <div className="relative h-64 overflow-hidden bg-slate-100">
                                {prop.images && prop.images[0] ? (
                                    <Image 
                                        src={prop.images[0]} 
                                        alt={prop.title} 
                                        fill 
                                        className="object-cover group-hover:scale-110 transition duration-700" 
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 font-medium text-sm">Image non disponible</div>
                                )}
                                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 border border-slate-100">
                                    {prop.type}
                                </div>
                                <div className="absolute bottom-4 right-4 bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg shadow-orange-900/20">
                                    {formatPrice(prop.price)}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-6">
                                <div className="flex items-center gap-1 text-orange-600 text-[10px] font-bold uppercase tracking-wider mb-2">
                                    <MapPin className="w-3 h-3" /> {prop.commune}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-4 line-clamp-1 group-hover:text-orange-600 transition">
                                    {prop.title}
                                </h3>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-slate-500 text-xs font-bold">
                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md"><BedDouble className="w-3 h-3"/> {prop.bedrooms} Ch.</span>
                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md"><Bath className="w-3 h-3"/> {prop.bathrooms} Douches</span>
                                    {prop.surface && <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md"><Square className="w-3 h-3"/> {prop.surface} m²</span>}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {properties.length === 0 && (
                    <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="inline-block p-4 bg-orange-50 rounded-full mb-4">
                            <Search className="w-8 h-8 text-orange-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Aucun bien trouvé</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-2">Essayez de modifier vos filtres (Commune ou Type) pour voir plus de résultats.</p>
                        <button onClick={() => setFilters({ type: "", commune: "", maxPrice: "" })} className="mt-6 text-orange-600 font-bold hover:underline">
                            Réinitialiser la recherche
                        </button>
                    </div>
                )}
            </>
        )}
      </main>

      {/* ==================================================================
          4. FOOTER PROFESSIONNEL
      ================================================================== */}
      <footer className="bg-[#0B1120] text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-12">
            
            {/* BRANDING */}
            <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-6">
                    <div className="relative w-8 h-8 opacity-80">
                        <Image src="/logo.png" alt="Logo" fill className="object-contain invert" /> 
                    </div>
                    <span className="font-bold text-white text-xl">ImmoFacile.CI</span>
                </div>
                <p className="text-sm leading-relaxed mb-6 max-w-sm">
                    La première plateforme immobilière 100% digitale en Côte d'Ivoire. 
                    Nous sécurisons la relation propriétaire-locataire grâce à la technologie.
                </p>
                <div className="flex gap-4">
                    <a href="#" className="p-2 bg-slate-800 rounded-full hover:bg-orange-500 hover:text-white transition"><Facebook className="w-4 h-4"/></a>
                    <a href="#" className="p-2 bg-slate-800 rounded-full hover:bg-orange-500 hover:text-white transition"><Instagram className="w-4 h-4"/></a>
                    <a href="#" className="p-2 bg-slate-800 rounded-full hover:bg-orange-500 hover:text-white transition"><Linkedin className="w-4 h-4"/></a>
                </div>
            </div>

            {/* LINKS */}
            <div>
                <h4 className="text-white font-bold mb-6">Légal & Aide</h4>
                <ul className="space-y-3 text-sm">
                    <li><Link href="/terms" className="hover:text-white transition">CGU & Mentions Légales</Link></li>
                    <li><Link href="/privacy" className="hover:text-white transition">Politique de Confidentialité</Link></li>
                    <li><Link href="/faq" className="hover:text-white transition">Foire aux Questions</Link></li>
                    <li><Link href="/support" className="hover:text-white transition">Support Technique</Link></li>
                </ul>
            </div>

            {/* CONTACT */}
            <div>
                <h4 className="text-white font-bold mb-6">Nous Contacter</h4>
                <ul className="space-y-4 text-sm">
                    <li className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-orange-500"/>
                        <a href="mailto:contact@webappci.com" className="hover:text-white transition">contact@webappci.com</a>
                    </li>
                    <li className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-orange-500"/>
                        <span>+225 07 00 00 00 00</span>
                    </li>
                    <li className="flex items-start gap-3 mt-4 pt-4 border-t border-slate-800">
                         <div className="relative w-16 h-8">
                             {/* Logo WebAppCI */}
                             <Image src="/logo2.png" alt="WebAppCI" fill className="object-contain opacity-50 hover:opacity-100 transition" />
                         </div>
                         <div className="text-xs">
                             <p>Solution développée par</p>
                             <p className="font-bold text-slate-300">WebAppCi SARL</p>
                         </div>
                    </li>
                </ul>
            </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-600">
            &copy; {new Date().getFullYear()} ImmoFacile CI. Tous droits réservés.
        </div>
      </footer>

    </div>
  );
}
