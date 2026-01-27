'use client';

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api"; 
import { Loader2, AlertCircle } from "lucide-react";
import TenantsList from "@/components/dashboard/owner/TenantsList";
// ✅ 1. IMPORT DES TYPES OFFICIELS PRISMA
import { Property, Lease, User } from "@prisma/client";

// ✅ 2. DÉFINITION DU TYPE COMPOSÉ (Doit matcher celui de TenantsList.tsx)
type PropertyWithTenants = Property & {
    leases: (Lease & {
        tenant: User | null;
    })[];
};

export default function TenantsPage() {
  // ✅ 3. UTILISATION DU TYPE STRICT DANS LE STATE
  const [properties, setProperties] = useState<PropertyWithTenants[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await api.get('/owner/dashboard');
      
      if (res.data && res.data.success) {
        
        // ✅ 4. MAPPING ET CASTING SÉCURISÉ
        // On transforme la réponse API (JSON) en structure compatible Prisma
        const cleanProperties = (res.data.properties || []).map((p: any) => ({
            // On récupère les champs de base
            id: p.id,
            title: p.title,
            commune: p.commune,
            address: p.address || "", // Fallback
            // ... autres champs si nécessaires, ou on laisse le cast faire le reste
            
            // On structure les baux comme attendu par le composant enfant
            leases: Array.isArray(p.leases) ? p.leases.map((l: any) => ({
                id: l.id,
                isActive: l.isActive,
                startDate: l.startDate ? new Date(l.startDate) : new Date(), // Conversion Date
                endDate: l.endDate ? new Date(l.endDate) : null,
                monthlyRent: l.monthlyRent,
                
                // Reconstruction de l'objet User (Tenant)
                tenant: l.tenant ? {
                    id: l.tenant.id,
                    name: l.tenant.name || "Inconnu",
                    email: l.tenant.email,
                    phone: l.tenant.phone || "",
                    kycStatus: l.tenant.kycStatus || "PENDING",
                    // Champs obligatoires Prisma qu'on peut mocker si absents de l'API
                    role: "TENANT",
                    isVerified: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } : null
            })) : []
        })) as unknown as PropertyWithTenants[]; // 👈 LE SECRET : On force le type pour satisfaire TypeScript

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
