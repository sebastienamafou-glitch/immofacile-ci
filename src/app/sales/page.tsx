"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Filter, Building2, Gavel } from "lucide-react";
import { api } from "@/lib/api"; 
import { PropertyCard } from "@/components/property/PropertyCard";

export default function SalesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ commune: "", legalStatus: "" });

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.commune) params.append("commune", filters.commune);
        if (filters.legalStatus) params.append("legalStatus", filters.legalStatus);
        
        const res = await api.get(`/public/sales?${params.toString()}`);
        setProperties(res.data.properties);
      } catch (err) {
        console.error("Erreur fetch sales", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, [filters]);

  return (
    <div className="min-h-screen bg-[#0B1120]">
      {/* HERO SECTION */}
      <header className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent opacity-50" />
        <div className="max-w-7xl mx-auto relative z-10 text-center">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter">
                Investissez en toute <span className="text-orange-500">SÉCURITÉ</span>
            </h1>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                Découvrez des terrains et propriétés vérifiés avec ACD ou Titre Foncier en Côte d&apos;Ivoire.
            </p>
        </div>
      </header>

      {/* FILTRES DYNAMIQUES */}
      <section className="sticky top-20 z-40 px-4 -mt-8">
          <div className="max-w-5xl mx-auto bg-white/5 backdrop-blur-2xl border border-slate-800 p-2 rounded-3xl shadow-2xl flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Commune (ex: Bingerville...)" 
                    className="w-full bg-transparent border-none text-white text-sm pl-12 pr-4 py-4 focus:ring-0"
                    onChange={(e) => setFilters({ ...filters, commune: e.target.value })}
                  />
              </div>
              <div className="h-8 w-[1px] bg-slate-800 hidden md:block" />
              <select 
                className="bg-transparent border-none text-white text-sm py-4 px-6 focus:ring-0 cursor-pointer"
                onChange={(e) => setFilters({ ...filters, legalStatus: e.target.value })}
              >
                  <option value="" className="bg-[#0B1120]">Tous les statuts légaux</option>
                  <option value="ACD" className="bg-[#0B1120]">ACD (Définitif)</option>
                  <option value="TITRE_FONCIER" className="bg-[#0B1120]">Titre Foncier</option>
                  <option value="ATTESTATION_VILLAGEOISE" className="bg-[#0B1120]">Attestation Villageoise</option>
              </select>
          </div>
      </section>

      {/* GRILLE DE BIENS */}
      <main className="max-w-7xl mx-auto px-4 py-20">
        {loading ? (
            <div className="flex flex-col items-center py-20">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Recherche des meilleures opportunités...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {properties.map((prop: any) => (
                    <PropertyCard 
                        key={prop.id}
                        id={prop.id}
                        title={prop.title}
                        price={Number(prop.priceCfa)}
                        location={prop.location}
                        surface={prop.surfaceArea}
                        images={prop.images}
                        type="SALE"
                        legalStatus={prop.legalStatus}
                        isVerified={prop.owner?.kyc?.status === 'VERIFIED'}
                    />
                ))}
            </div>
        )}
      </main>
    </div>
  );
}
