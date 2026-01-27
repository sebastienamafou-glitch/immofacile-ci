"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Loader2, Receipt, ArrowLeft, Plus, 
  Calendar, Building2, TrendingDown, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

// Typage pour éviter le 'any'
interface Expense {
    id: string;
    date: string;
    category: string;
    description: string;
    amount: number;
    propertyTitle: string;
    source: string;
}

export default function ExpensesHistoryPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        // ✅ APPEL SÉCURISÉ : Cookie Only (Plus de localStorage)
        const res = await api.get('/owner/expenses');
        
        if (res.data.success) {
          setExpenses(res.data.expenses);
        }
      } catch (e: any) {
        console.error("Erreur chargement dépenses", e);
        if (e.response?.status === 401) {
            router.push('/login');
        } else {
            toast.error("Impossible de charger l'historique.");
        }
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
          <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
            <Receipt className="text-red-500 w-8 h-8" /> Historique Dépenses
          </h1>
        </div>

        <button 
          onClick={() => router.push('/dashboard/owner/expenses/add')}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-red-600/20 transition active:scale-95 text-xs uppercase tracking-wide"
        >
          <Plus className="w-5 h-5" /> Déclarer une sortie
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Sorties</p>
          <p className="text-3xl font-black text-white">{totalExpenses.toLocaleString()} <span className="text-sm text-red-500">FCFA</span></p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nombre d'opérations</p>
          <p className="text-3xl font-black text-white">{expenses.length}</p>
        </div>
        <div className="bg-red-900/10 border border-red-500/20 p-6 rounded-[2rem]">
            <TrendingDown className="text-red-500 mb-2 w-6 h-6" />
            <p className="text-xs text-red-200/60 font-medium leading-relaxed">
                Ces montants (Travaux, Maintenance, Frais) sont automatiquement déduits de votre solde net disponible avant retrait.
            </p>
        </div>
      </div>

      {/* LISTE */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 bg-slate-950">
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Bien Immobilier</th>
                <th className="px-6 py-5">Catégorie</th>
                <th className="px-6 py-5">Détails</th>
                <th className="px-6 py-5 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-800/50 transition group">
                  <td className="px-6 py-5 text-sm font-bold text-slate-400">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-600" />
                        {new Date(exp.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 ${exp.propertyTitle !== 'Global' ? 'text-orange-500' : 'text-slate-600'}`} />
                        <span className="text-sm font-bold text-white">{exp.propertyTitle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${
                        exp.category === 'MAINTENANCE' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        exp.category === 'MANUEL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-400 font-medium">
                    {exp.description}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-lg font-black text-red-500">-{exp.amount.toLocaleString()} F</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {expenses.length === 0 && (
          <div className="text-center py-24 flex flex-col items-center border-t border-slate-800">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-white font-bold text-lg">Aucune dépense</p>
            <p className="text-slate-500 text-sm mt-1">Tout est calme sur vos comptes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
