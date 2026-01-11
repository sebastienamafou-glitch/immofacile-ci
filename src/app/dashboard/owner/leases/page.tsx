'use client';

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation"; // ✅ Ajout du router pour rediriger si pas connecté
import { api } from "@/lib/api"; 
import { Loader2, FileText, Plus, MapPin, User, Wallet } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner"; // ✅ Ajout pour feedback utilisateur

interface Lease {
  id: string;
  isActive: boolean;
  startDate: string;
  monthlyRent: number;
  tenant: { name: string; phone: string; };
  property: { title: string; commune: string; };
}

export default function LeasesPage() {
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeases = useCallback(async () => {
    // 1. SÉCURITÉ : On vérifie qui est connecté
    const stored = localStorage.getItem("immouser");
    if (!stored) {
        // Pas connecté ? On renvoie au login sans faire d'erreur API
        router.push('/login');
        return;
    }
    const user = JSON.parse(stored);

    setIsLoading(true);
    try {
      // 2. APPEL API SÉCURISÉ
      const res = await api.get('/owner/leases', {
          headers: { 'x-user-email': user.email } // ✅ La clé magique !
      });
      
      if (res.data) {
         const data = Array.isArray(res.data) ? res.data : (res.data.leases || []);
         setLeases(data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Impossible de charger les contrats.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchLeases(); }, [fetchLeases]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0B1120] text-slate-400 gap-4">
      <Loader2 className="w-10 h-10 text-[#F59E0B] animate-spin" />
      <p className="font-bold uppercase tracking-widest text-xs">Chargement des baux...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
           <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
             <FileText className="text-[#F59E0B]" /> Baux & Contrats
           </h1>
           <p className="text-slate-500 text-sm mt-1">
             Gestion juridique et suivi des {leases.length} contrat(s) actif(s).
           </p>
        </div>
        <Link href="/dashboard/owner/tenants" className="bg-[#F59E0B] text-[#0B1120] px-6 py-3 rounded-xl font-black text-sm hover:scale-105 transition shadow-lg flex items-center gap-2">
           <Plus className="w-5 h-5" /> NOUVEAU BAIL
        </Link>
      </div>

      {/* Liste des Baux */}
      {leases.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
           {leases.map((lease) => (
             <Link key={lease.id} href={`/dashboard/owner/leases/${lease.id}`} className="block group">
               <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-[#F59E0B]/50 transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between shadow-xl">
                  
                  <div>
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl group-hover:bg-[#F59E0B] group-hover:text-black transition shadow-inner border border-slate-700">
                            📜
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${lease.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                            {lease.isActive ? 'Bail Actif' : 'Clôturé'}
                        </span>
                    </div>
                    
                    <h3 className="font-black text-xl text-white mb-1 group-hover:text-[#F59E0B] transition truncate">{lease.property?.title}</h3>
                    <p className="text-slate-500 text-xs mb-6 flex items-center gap-1 font-bold">
                        <MapPin className="w-3 h-3" /> {lease.property?.commune}
                    </p>

                    <div className="flex items-center gap-2 mb-6">
                        <Wallet className="w-4 h-4 text-emerald-500" />
                        <span className="text-lg font-black text-emerald-400">{lease.monthlyRent.toLocaleString()} F</span>
                        <span className="text-[10px] text-slate-600 font-bold uppercase">/ mois</span>
                    </div>
                  </div>
                  
                  <div className="pt-5 border-t border-slate-800/50 flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-600" />
                        <span className="text-slate-400 font-bold text-xs uppercase tracking-tighter">Locataire</span>
                      </div>
                      <span className="text-white font-black truncate max-w-[140px]">{lease.tenant?.name}</span>
                  </div>
               </div>
             </Link>
           ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/30 text-center">
           <div className="bg-slate-800 w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                <FileText className="w-12 h-12 text-slate-600" />
           </div>
           <h3 className="text-2xl font-black text-white mb-2">Aucun contrat</h3>
           <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium">Officialisez vos locations en générant votre premier bail numérique certifié conforme.</p>
           <Link href="/dashboard/owner/tenants" className="bg-white text-black px-8 py-3 rounded-xl font-black hover:bg-[#F59E0B] transition">
                CRÉER MON PREMIER CONTRAT
           </Link>
        </div>
      )}
    </main>
  );
}
