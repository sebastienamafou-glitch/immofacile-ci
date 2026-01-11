"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Loader2, Receipt, ArrowLeft, Plus, 
  Calendar, Building2, TrendingDown, AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ExpensesHistoryPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      // 1. SÉCURITÉ : On récupère l'identité
      const stored = localStorage.getItem("immouser");
      if (!stored) { router.push('/login'); return; }
      const user = JSON.parse(stored);

      try {
        // 2. APPEL SÉCURISÉ vers la nouvelle route dédiée
        const res = await api.get('/owner/expenses', {
            headers: { 'x-user-email': user.email }
        });
        
        if (res.data.success) {
          setExpenses(res.data.expenses);
        }
      } catch (e) {
        console.error("Erreur chargement dépenses", e);
        toast.error("Impossible de charger l'historique.");
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [router]);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-red-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 pb-20 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-white mb-2 transition font-bold text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Receipt className="text-red-500" /> HISTORIQUE DES DÉPENSES
          </h1>
        </div>

        <button 
          onClick={() => router.push('/dashboard/owner/expenses/add')}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-red-600/20 transition active:scale-95"
        >
          <Plus className="w-5 h-5" /> NOUVELLE DÉPENSE
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Sorties</p>
          <p className="text-3xl font-black text-white">{totalExpenses.toLocaleString()} <span className="text-sm text-red-500">FCFA</span></p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nombre d'opérations</p>
          <p className="text-3xl font-black text-white">{expenses.length}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl">
            <TrendingDown className="text-red-500 mb-2" />
            <p className="text-xs text-red-200/60 font-medium">Ces montants sont déduits de votre solde net avant retrait.</p>
        </div>
      </div>

      {/* LISTE */}
      <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Bien Immobilier</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-white/5 transition group">
                  <td className="px-6 py-4 text-sm font-medium text-slate-400">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        {new Date(exp.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 ${exp.propertyTitle ? 'text-orange-500' : 'text-slate-600'}`} />
                        <span className="text-sm font-bold text-white">{exp.propertyTitle || "Global / Non lié"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-slate-400 uppercase border border-white/5">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 italic">
                    {exp.description}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-black text-red-500">-{exp.amount.toLocaleString()} F</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {expenses.length === 0 && (
          <div className="text-center py-20 flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-slate-700 mb-4" />
            <p className="text-slate-500 font-bold uppercase text-xs tracking-tighter">Aucune dépense enregistrée</p>
          </div>
        )}
      </div>
    </div>
  );
}
