'use client';

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api"; 
import { Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import TenantsList from "@/components/dashboard/owner/TenantsList";

// ==========================================
// 1. DÉFINITION DES TYPES (Alignée avec TenantsList)
// ==========================================

interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone: string;
  // ✅ CORRECTION : Ajout du champ manquant requis par TenantsList
  kycStatus: string; 
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
  leases: Lease[];
  tenants?: Tenant[];
}

// ==========================================
// 2. COMPOSANT PRINCIPAL
// ==========================================

export default function TenantsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await api.get('/owner/dashboard');
      
      if (res.data && res.data.success) {
        // ✅ NETTOYAGE & MAPPING DES DONNÉES
        const cleanProperties: Property[] = (res.data.properties || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            commune: p.commune,
            // On map les baux pour s'assurer que la structure Tenant est complète
            leases: Array.isArray(p.leases) ? p.leases.map((l: any) => ({
                id: l.id,
                isActive: l.isActive,
                startDate: l.startDate,
                endDate: l.endDate,
                monthlyRent: l.monthlyRent,
                tenant: {
                    id: l.tenant?.id || "unknown",
                    name: l.tenant?.name || "Inconnu",
                    email: l.tenant?.email,
                    phone: l.tenant?.phone || "",
                    // ✅ AJOUT DE LA VALEUR PAR DÉFAUT SI MANQUANTE
                    kycStatus: l.tenant?.kycStatus || "PENDING" 
                }
            })) : [],
            tenants: p.tenants
        }));

        setProperties(cleanProperties);
      } else {
        throw new Error("Format de réponse invalide");
      }
    } catch (err) {
      console.error("Erreur chargement locataires:", err);
      setError("Impossible de charger la liste des locataires.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenantsData();
  }, [fetchTenantsData]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#0B1120] gap-4">
        <Loader2 className="w-12 h-12 text-[#F59E0B] animate-spin" />
        <p className="text-slate-400 text-sm animate-pulse">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#0B1120] p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <p className="text-slate-400 mb-6">{error}</p>
        <button onClick={fetchTenantsData} className="bg-slate-800 text-white px-6 py-2 rounded-lg">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 pb-20 font-sans">
      <header className="mb-8 border-b border-slate-800/50 pb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
          👥 Mes Locataires
          <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-full border border-slate-700 font-normal normal-case">
            {properties.length} biens
          </span>
        </h1>
      </header>

      {properties.length > 0 ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* TypeScript sera content : kycStatus est maintenant présent ! */}
           <TenantsList properties={properties} />
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
           <h3 className="text-xl font-bold text-white">Aucun locataire trouvé</h3>
           <p className="text-slate-500">Ajoutez d'abord un bien immobilier.</p>
        </div>
      )}
    </main>
  );
}
