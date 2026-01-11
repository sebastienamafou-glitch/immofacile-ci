'use client';

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api"; 
import { Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import TenantsList from "@/components/dashboard/owner/TenantsList";

// ==========================================
// 1. DÉFINITION DES TYPES
// ==========================================

interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone: string;
}

interface Lease {
  id: string;
  isActive: boolean;
  tenant: Tenant;
  startDate: string;
  endDate?: string;
  monthlyRent: number;
}

interface Property {
  id: string;
  title: string;
  commune: string;
  leases?: Lease[]; // Les locataires sont souvent liés via les baux
  tenants?: Tenant[]; // Cas où l'API renvoie directement les locataires
}

// ==========================================
// 2. COMPOSANT PRINCIPAL
// ==========================================

export default function TenantsPage() {
  // États
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction de récupération des données (isolée pour pouvoir "Réessayer")
  const fetchTenantsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Note: Idéalement, une route dédiée '/owner/tenants' serait plus légère que '/owner/dashboard'
      const res = await api.get('/owner/dashboard');
      
      if (res.data && res.data.success) {
        setProperties(res.data.properties || []);
      } else {
        throw new Error("Format de réponse invalide");
      }
    } catch (err) {
      console.error("Erreur chargement locataires:", err);
      setError("Impossible de charger la liste des locataires. Vérifiez votre connexion.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    fetchTenantsData();
  }, [fetchTenantsData]);

  // ==========================================
  // 3. RENDUS CONDITIONNELS (Loading / Error)
  // ==========================================

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#0B1120] gap-4">
        <Loader2 className="w-12 h-12 text-[#F59E0B] animate-spin" />
        <p className="text-slate-400 text-sm animate-pulse">Chargement de vos locataires...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#0B1120] p-6 text-center">
        <div className="bg-red-500/10 p-4 rounded-full mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Une erreur est survenue</h2>
        <p className="text-slate-400 mb-6 max-w-md">{error}</p>
        <button 
          onClick={fetchTenantsData}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition font-bold"
        >
          <RefreshCcw className="w-4 h-4" /> Réessayer
        </button>
      </div>
    );
  }

  // ==========================================
  // 4. RENDU PRINCIPAL
  // ==========================================

  const hasProperties = properties.length > 0;

  return (
    <main className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 pb-20 font-sans">
      
      {/* En-tête */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800/50 pb-6">
        <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-3">
              👥 Mes Locataires
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-full border border-slate-700 font-normal normal-case tracking-normal">
                {properties.length} biens suivis
              </span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm max-w-xl">
              Gérez les contrats de bail, suivez les paiements et accédez aux dossiers de vos locataires actifs.
            </p>
        </div>
        
        {/* Bouton d'action (Optionnel : si vous avez une page d'ajout manuel) */}
        {/* <Link href="/owner/add-tenant" className="bg-[#F59E0B] text-[#0B1120] px-5 py-3 rounded-xl font-bold text-sm hover:bg-yellow-400 transition shadow-lg flex items-center gap-2">
            <span>+</span> Nouveau Locataire
        </Link> 
        */}
      </header>

      {/* Contenu */}
      {hasProperties ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* On passe les propriétés nettoyées au composant liste */}
           <TenantsList properties={properties} />
        </div>
      ) : (
        /* État vide (si le tableau properties est vide) */
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
           <div className="text-4xl mb-4">🏠</div>
           <h3 className="text-xl font-bold text-white mb-2">Aucun bien / locataire trouvé</h3>
           <p className="text-slate-500 max-w-xs mx-auto">
             Commencez par ajouter un bien immobilier pour pouvoir y assigner des locataires.
           </p>
        </div>
      )}
    </main>
  );
}
