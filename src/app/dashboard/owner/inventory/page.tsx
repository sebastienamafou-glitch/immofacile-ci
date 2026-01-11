'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Loader2, ClipboardList, Plus, MapPin, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryListPage() {
  const [inventories, setInventories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventories = async () => {
        // 1. Récupération User
        const stored = localStorage.getItem("immouser");
        if (!stored) return;
        const user = JSON.parse(stored);

        try {
            // 2. Appel Sécurisé
            const res = await api.get('/owner/inventory', {
                headers: { 'x-user-email': user.email }
            });
            if(res.data.success) {
                setInventories(res.data.inventories);
            }
        } catch (error) {
            console.error(error);
            toast.error("Impossible de charger les états des lieux");
        } finally {
            setLoading(false);
        }
    };

    fetchInventories();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0B1120]"><Loader2 className="animate-spin text-[#F59E0B]" /></div>;

  return (
    <main className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-2">📋 États des lieux</h1>
           <p className="text-slate-400 text-sm mt-1">Entrées et sorties locataires.</p>
        </div>
        <Link href="/dashboard/owner/inventory/new" className="bg-[#F59E0B] text-black px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-400 transition shadow-lg">
           <Plus size={20} /> <span className="hidden md:inline">Nouvel EDL</span>
        </Link>
      </div>

      {inventories.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
           <ClipboardList className="w-16 h-16 text-slate-600 mx-auto mb-4" />
           <p className="text-slate-400">Aucun état des lieux enregistré.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
           {inventories.map((inv) => (
             <div key={inv.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-slate-600 transition group">
                <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${inv.type === 'ENTREE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {inv.type === 'ENTREE' ? 'Entrée' : 'Sortie'}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={12} /> {new Date(inv.date).toLocaleDateString()}
                    </span>
                </div>
                {/* On sécurise l'affichage avec le ?. au cas où une relation manque */}
                <h3 className="font-bold text-lg mb-1">{inv.lease?.property?.title || "Bien Inconnu"}</h3>
                <p className="text-slate-400 text-xs mb-4 flex items-center gap-1">
                    <MapPin size={12} /> {inv.lease?.property?.commune || "-"}
                </p>
                <div className="pt-4 border-t border-slate-800 text-sm text-slate-300">
                    Locataire : <span className="font-bold text-white">{inv.lease?.tenant?.name || "Inconnu"}</span>
                </div>
             </div>
           ))}
        </div>
      )}
    </main>
  );
}
