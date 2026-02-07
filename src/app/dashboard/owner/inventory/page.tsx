"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Loader2, ClipboardList, Plus, MapPin, Calendar, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Inventory, Lease, Property, User } from '@prisma/client';
import { auth } from "@/auth";

// Type composite pour l'UI
type InventoryWithDetails = Inventory & {
    lease: Lease & {
        property: Property;
        tenant: User;
    }
};

export default function InventoryListPage() {
  const [inventories, setInventories] = useState<InventoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventories = async () => {
        try {
            // ✅ APPEL SÉCURISÉ (Cookie Only)
            const res = await api.get('/owner/inventory');
            
            if(res.data.success) {
                setInventories(res.data.inventories);
            }
        } catch (error) {
            console.error(error);
            toast.error("Impossible de charger l'historique.");
        } finally {
            setLoading(false);
        }
    };

    fetchInventories();
  }, []);

  if (loading) return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] gap-4">
          <Loader2 className="animate-spin text-[#F59E0B] w-12 h-12" />
          <p className="text-slate-500 font-mono text-sm">Chargement des dossiers...</p>
      </div>
  );

  return (
    <main className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
           <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
               <ClipboardList className="w-8 h-8 text-[#F59E0B]" /> États des lieux
           </h1>
           <p className="text-slate-400 text-sm mt-1">
               {inventories.length} constats numériques archivés.
           </p>
        </div>
        <Link 
            href="/dashboard/owner/inventory/new" 
            className="bg-[#F59E0B] text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-400 transition shadow-lg shadow-yellow-500/10 active:scale-95"
        >
           <Plus size={20} /> <span>Nouveau Constat</span>
        </Link>
      </div>

      {inventories.length === 0 ? (
        /* EMPTY STATE */
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
           <div className="bg-slate-800 p-6 rounded-full mb-6">
                <ClipboardList className="w-12 h-12 text-slate-500" />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">Aucun constat enregistré</h3>
           <p className="text-slate-500 max-w-sm text-center mb-8 text-sm">
               Réalisez votre premier état des lieux numérique (Entrée ou Sortie) pour protéger votre bien contre les dégradations.
           </p>
           <Link href="/dashboard/owner/inventory/new" className="text-[#F59E0B] hover:text-white transition font-bold border-b-2 border-[#F59E0B] pb-1">
                Démarrer un état des lieux &rarr;
           </Link>
        </div>
      ) : (
        /* GRID LIST */
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
           {inventories.map((inv) => {
             // Détection du type pour le badge
             const isEntry = inv.type === 'ETAT_DES_LIEUX_ENTREE';
             
             return (
                <Link key={inv.id} href={`/dashboard/owner/inventory/${inv.id}`} className="group block h-full">
                    <div className="bg-[#0F172A] border border-slate-800 p-6 rounded-2xl hover:border-[#F59E0B]/50 hover:bg-slate-900 transition-all duration-300 h-full flex flex-col justify-between relative overflow-hidden shadow-lg">
                        
                        {/* Status Badge */}
                        <div className="flex justify-between items-start mb-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                isEntry 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                                {isEntry ? '📥 Entrée' : '📤 Sortie'}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1 font-mono bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                                <Calendar size={12} /> {new Date(inv.date).toLocaleDateString()}
                            </span>
                        </div>

                        {/* Corps de Carte */}
                        <div className="mb-6">
                            <h3 className="font-bold text-lg text-white mb-1 group-hover:text-[#F59E0B] transition truncate pr-8">
                                {inv.lease?.property?.title || "Propriété inconnue"}
                            </h3>
                            <p className="text-slate-400 text-xs flex items-center gap-1 font-medium">
                                <MapPin size={12} className="text-[#F59E0B]" /> {inv.lease?.property?.commune || "Adresse N/A"}
                            </p>
                        </div>

                        {/* Footer Locataire */}
                        <div className="pt-4 border-t border-slate-800 flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700">
                                    {inv.lease?.tenant?.name?.charAt(0) || "?"}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white leading-none">{inv.lease?.tenant?.name || "Locataire Inconnu"}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Locataire</p>
                                </div>
                            </div>
                            
                            <div className="bg-slate-800 p-2 rounded-lg text-slate-400 group-hover:bg-[#F59E0B] group-hover:text-black transition shadow-sm">
                                <Eye size={16} />
                            </div>
                        </div>
                    </div>
                </Link>
             );
           })}
        </div>
      )}
    </main>
  );
}
