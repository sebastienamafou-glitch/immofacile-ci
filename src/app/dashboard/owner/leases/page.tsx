"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation"; 
import { api } from "@/lib/api"; 
import { Loader2, FileText, Plus, MapPin, Wallet, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Lease, Property, User } from "@prisma/client";

// Type étendu pour l'affichage (Jointures)
type LeaseWithDetails = Lease & {
  property: Property;
  tenant: User;
};

export default function LeasesListPage() {
  const router = useRouter();
  const [leases, setLeases] = useState<LeaseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeases = useCallback(async () => {
    try {
      // ✅ APPEL SÉCURISÉ : Le cookie fait tout le travail
      const res = await api.get('/owner/leases');
      
      if (res.data.success) {
         setLeases(res.data.leases);
      } else {
         throw new Error(res.data.error);
      }
    } catch (err: any) {
      console.error(err);
      // Redirection si 401 (Session morte)
      if (err.response?.status === 401) {
          router.push('/login');
      } else {
          toast.error("Erreur de chargement des contrats.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchLeases(); }, [fetchLeases]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0B1120] gap-4">
      <Loader2 className="w-10 h-10 text-[#F59E0B] animate-spin" />
      <p className="text-slate-500 text-sm font-mono">Récupération des dossiers...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 pb-20">
      
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
           <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
             <FileText className="text-[#F59E0B] w-8 h-8" /> Mes Contrats
           </h1>
           <p className="text-slate-500 text-sm mt-1">
             Gérez vos {leases.length} baux actifs et archivés.
           </p>
        </div>
        
        <Link 
            href="/dashboard/owner/leases/new" 
            className="bg-[#F59E0B] text-[#0B1120] px-6 py-3 rounded-xl font-bold text-sm hover:bg-yellow-400 transition shadow-lg shadow-yellow-500/10 flex items-center gap-2 active:scale-95"
        >
           <Plus className="w-5 h-5" /> NOUVEAU BAIL
        </Link>
      </div>

      {/* Grille des Contrats */}
      {leases.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
           {leases.map((lease) => (
             <Link key={lease.id} href={`/dashboard/owner/leases/${lease.id}`} className="block group h-full">
               <div className="bg-[#0f172a] border border-white/5 rounded-3xl p-6 hover:border-[#F59E0B]/50 hover:bg-slate-900 transition-all duration-300 h-full flex flex-col justify-between relative overflow-hidden shadow-xl">
                  
                  {/* Badge Statut */}
                  <div className="absolute top-6 right-6 z-10">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        lease.isActive 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-slate-700/30 text-slate-500 border-slate-700/50'
                    }`}>
                        {lease.isActive ? 'ACTIF' : lease.status === 'PENDING' ? 'EN ATTENTE' : lease.status}
                    </span>
                  </div>

                  {/* Corps de la carte */}
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition shadow-inner">
                        🏠
                    </div>
                    
                    <h3 className="font-bold text-lg text-white mb-1 truncate pr-20">{lease.property?.title || "Bien supprimé"}</h3>
                    <p className="text-slate-500 text-xs mb-6 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {lease.property?.commune || "N/A"}
                    </p>

                    <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                             <Wallet className="w-4 h-4 text-slate-500"/> Loyer
                        </div>
                        <span className="font-mono font-bold text-emerald-400 text-lg">
                            {lease.monthlyRent.toLocaleString()} F
                        </span>
                    </div>
                  </div>
                  
                  {/* Footer Locataire */}
                  <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-white/5">
                          {lease.tenant?.name?.charAt(0) || "?"}
                      </div>
                      <div>
                          <p className="text-sm font-bold text-white leading-none">{lease.tenant?.name || "Locataire Inconnu"}</p>
                          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Locataire</p>
                      </div>
                  </div>
               </div>
             </Link>
           ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20 text-center animate-in fade-in zoom-in-95 duration-500">
           <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-slate-600" />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">Aucun contrat actif</h3>
           <p className="text-slate-500 max-w-xs mx-auto mb-6 text-sm">
               Créez votre premier contrat de location pour commencer à générer des revenus.
           </p>
           <Link href="/dashboard/owner/leases/new" className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-sm shadow-xl">
                Créer un bail maintenant
           </Link>
        </div>
      )}
    </div>
  );
}
