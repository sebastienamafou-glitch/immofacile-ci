"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, ArrowRight, Loader2 } from "lucide-react";
import ListingCard from "@/components/guest/ListingCard"; // ✅ Import du composant créé
import { toast } from "sonner";

export default function GuestDashboard() {
  
  // --- ÉTATS ---
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // --- 1. CHARGEMENT USER & DATA INITIALE ---
  useEffect(() => {
    // Récupération user depuis localStorage (Adaptez selon votre auth)
    const storedUser = localStorage.getItem("immouser");
    if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUserEmail(parsed.email);
    }

    fetchListings("");
  }, []);

  // --- 2. FONCTION DE RECHERCHE API ---
  const fetchListings = async (searchQuery: string) => {
    setLoading(true);
    try {
        const headers: any = {};
        // Astuce : On récupère l'email du localstorage si dispo pour les favoris
        const storedUser = localStorage.getItem("immouser");
        if (storedUser) headers['x-user-email'] = JSON.parse(storedUser).email;

        const res = await fetch(`/api/guest/search?q=${searchQuery}`, { headers });
        const data = await res.json();
        
        if (data.success) {
            setListings(data.listings);
        }
    } catch (error) {
        console.error("Erreur fetch", error);
        toast.error("Impossible de charger les annonces");
    } finally {
        setLoading(false);
    }
  };

  // Gestion soumission formulaire
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings(query);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 pb-20 font-sans">
      
      {/* HERO SECTION */}
      <div className="relative bg-slate-900 border-b border-white/5 p-8 sm:p-12 rounded-b-[3rem] overflow-hidden shadow-2xl shadow-black/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-block py-1 px-3 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider animate-pulse">
            Espace Voyageur Akwaba
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Où souhaitez-vous aller{userEmail ? `, ` : ''}<span className="text-orange-500">{userEmail ? 'Paul' : ''}</span> ?
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Découvrez nos résidences exclusives à Abidjan, Assinie et au-delà.
          </p>

          {/* BARRE DE RECHERCHE ACTIVE */}
          <form onSubmit={handleSearch} className="mt-8 bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto shadow-2xl transition-all focus-within:border-orange-500/50 focus-within:bg-slate-900/80">
            <div className="flex-1 flex items-center px-4 py-3 bg-slate-900/50 rounded-xl border border-transparent transition-colors group w-full">
              <MapPin className="w-5 h-5 text-slate-500 group-hover:text-orange-500 transition-colors mr-3 shrink-0" />
              <div className="text-left flex-1">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Destination</p>
                <input 
                    type="text" 
                    placeholder="Ex: Cocody, Assinie..." 
                    className="w-full bg-transparent border-none outline-none text-white font-bold placeholder:text-slate-600 text-sm p-0 h-auto"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            
            <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-black font-bold p-4 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-orange-500/20 active:scale-95">
              {loading ? <Loader2 className="w-6 h-6 animate-spin"/> : <Search className="w-6 h-6" />}
            </button>
          </form>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">

        {/* PROMO BANNER */}
        <div className="bg-gradient-to-r from-blue-900/40 to-slate-900 border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-blue-500/20 transition duration-700"></div>
             <div className="relative z-10 text-center md:text-left">
                <h2 className="text-2xl font-bold text-white mb-2">Pas encore de voyage prévu ?</h2>
                <p className="text-slate-400">Profitez de -10% sur votre première réservation avec le code <span className="text-white font-mono bg-white/10 px-2 rounded">AKWABA10</span>.</p>
             </div>
             <button onClick={() => { setQuery(""); fetchListings(""); }} className="relative z-10 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition flex items-center gap-2 shadow-lg whitespace-nowrap">
                Voir tout le catalogue <ArrowRight className="w-4 h-4"/>
             </button>
        </div>

        {/* LISTINGS GRID */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {query ? `Résultats pour "${query}"` : "Nos coups de cœur"}
                <span className="text-sm font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full ml-2">{listings.length}</span>
            </h2>
          </div>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                <p className="text-slate-500 animate-pulse">Recherche des meilleures pépites...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {listings.length > 0 ? (
                  listings.map((item) => (
                    // ✅ COMPOSANT CARTE INTELLIGENT
                    <ListingCard 
                        key={item.id} 
                        data={item} 
                        currentUserEmail={userEmail} 
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                      <p className="text-slate-400 text-lg mb-2">Aucun logement trouvé 😢</p>
                      <button onClick={() => { setQuery(""); fetchListings(""); }} className="text-orange-500 font-bold hover:underline">
                          Voir toutes les annonces
                      </button>
                  </div>
                )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
