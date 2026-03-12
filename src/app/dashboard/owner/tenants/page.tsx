"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
    Loader2, Users, Plus, MapPin, Wallet, 
    Phone, Mail, ShieldCheck, ShieldAlert, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// ✅ DTO STRICT : Aligné sur la réponse de /api/owner/tenants/route.ts
export interface TenantDTO {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    image: string | null;
    kycStatus: string;
    solvency: number;
    globalStatus: string;
    jobTitle: string | null;
    currentProperty: {
        title: string;
        commune: string;
        rent: number;
    } | null;
}

export default function TenantsListPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await api.get('/owner/tenants');
        if (res.data.success) {
           setTenants(res.data.tenants);
        } else {
           throw new Error(res.data.error);
        }
      } catch (err: unknown) {
        console.error(err);
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
            router.push('/login');
        } else {
            toast.error("Erreur de chargement des locataires.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, [router]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0B1120] gap-4">
      <Loader2 className="w-10 h-10 text-[#F59E0B] animate-spin" />
      <p className="text-slate-500 text-sm font-mono">Chargement de votre base locataires...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
           <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
             <Users className="text-[#F59E0B] w-8 h-8" /> Mes Locataires
           </h1>
           <p className="text-slate-500 text-sm mt-1">
             Gérez votre portefeuille de {tenants.length} locataire(s).
           </p>
        </div>
        
        {/* On redirige logiquement vers la création de bail */}
        <Link 
            href="/dashboard/owner/leases/new" 
            className="bg-[#F59E0B] text-[#0B1120] px-6 py-3 rounded-xl font-bold text-sm hover:bg-yellow-400 transition shadow-lg shadow-yellow-500/10 flex items-center gap-2 active:scale-95"
        >
           <Plus className="w-5 h-5" /> NOUVEAU LOCATAIRE (BAIL)
        </Link>
      </div>

      {/* GRILLE DES LOCATAIRES */}
      {tenants.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
           {tenants.map((tenant) => (
             <div key={tenant.id} className="bg-[#0f172a] border border-white/5 rounded-3xl p-6 hover:border-[#F59E0B]/50 transition-all duration-300 relative shadow-xl flex flex-col h-full group">
                  
                  {/* BADGES ABSOLUS (Statut & KYC) */}
                  <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-10">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        tenant.globalStatus === 'ACTIF'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-slate-700/30 text-slate-500 border-slate-700/50'
                    }`}>
                        {tenant.globalStatus}
                    </span>
                    
                    {tenant.kycStatus === 'VERIFIED' ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                            <ShieldCheck className="w-3 h-3" /> KYC VÉRIFIÉ
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20 animate-pulse">
                            <ShieldAlert className="w-3 h-3" /> KYC EN ATTENTE
                        </div>
                    )}
                  </div>

                  {/* PROFIL LOCATAIRE */}
                  <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-2xl font-black text-slate-400 shadow-inner overflow-hidden">
                          {tenant.image ? (
                              <img src={tenant.image} alt={tenant.name} className="w-full h-full object-cover" />
                          ) : (
                              tenant.name.charAt(0).toUpperCase()
                          )}
                      </div>
                      <div className="pr-20">
                          <h3 className="font-bold text-lg text-white leading-tight">{tenant.name}</h3>
                          <p className="text-xs text-slate-400 font-medium">{tenant.jobTitle || "Profession non renseignée"}</p>
                      </div>
                  </div>

                  {/* CONTACT INFO */}
                  <div className="space-y-2 mb-6 text-sm text-slate-300">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center"><Phone className="w-3 h-3 text-slate-400" /></div>
                          <span className="font-mono">{tenant.phone || "Non renseigné"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center"><Mail className="w-3 h-3 text-slate-400" /></div>
                          <span className="truncate pr-4">{tenant.email}</span>
                      </div>
                  </div>

                  {/* DATA IMMOBILIÈRE & FINANCIÈRE */}
                  <div className="mt-auto space-y-3">
                      {tenant.currentProperty ? (
                          <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bien Actuel</span>
                              <div className="flex items-start justify-between">
                                  <div>
                                      <p className="text-sm font-bold text-white truncate max-w-[180px]">{tenant.currentProperty.title}</p>
                                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/> {tenant.currentProperty.commune}</p>
                                  </div>
                                  <span className="font-mono font-bold text-emerald-400 text-sm bg-emerald-400/10 px-2 py-1 rounded">
                                      {tenant.currentProperty.rent.toLocaleString()} F
                                  </span>
                              </div>
                          </div>
                      ) : (
                          <div className="bg-slate-950/50 rounded-xl p-3 border border-dashed border-slate-700 text-center text-xs text-slate-500 italic">
                              Aucun bail actif actuellement
                          </div>
                      )}

                      <div className="flex items-center justify-between bg-slate-800/30 rounded-xl p-3 border border-white/5">
                          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                              <Wallet className="w-4 h-4 text-[#F59E0B]"/> Solvabilité (Wallet)
                          </div>
                          <span className={`font-mono font-black ${tenant.solvency >= (tenant.currentProperty?.rent || 0) ? 'text-emerald-500' : 'text-orange-500'}`}>
                              {tenant.solvency.toLocaleString()} F
                          </span>
                      </div>
                  </div>

             </div>
           ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20 text-center animate-in fade-in zoom-in-95 duration-500">
           <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-slate-600" />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">Aucun locataire enregistré</h3>
           <p className="text-slate-500 max-w-sm mx-auto mb-6 text-sm">
               Vos locataires apparaîtront ici une fois que vous leur aurez créé un contrat de bail.
           </p>
           <Link href="/dashboard/owner/leases/new" className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-sm shadow-xl">
                Créer un bail maintenant
           </Link>
        </div>
      )}
    </div>
  );
}
