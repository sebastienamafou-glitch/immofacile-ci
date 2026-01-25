"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  Wallet, TrendingUp, DollarSign, Calendar, Search, 
  Activity, Loader2, AlertCircle, ArrowUpRight 
} from "lucide-react";

// ✅ IMPORT DU MODULE DE DISTRIBUTION
import DividendDistributor from "@/components/admin/DividendDistributor";

// --- TYPES STRICTS (DTO) ---
interface FinanceStats {
  volume: number;
  totalRevenue: number;
  transactionCount: number;
}

interface TransactionHistory {
  id: string;
  amount: number;
  commission: number;
  status: string;
  date: string;
  type: string;
  details: string;
}

interface FinanceData {
  stats: FinanceStats;
  history: TransactionHistory[];
}

export default function FinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinanceData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchFinanceData = async () => {
        try {
            // 🔒 SÉCURITÉ : Auth via Cookie HttpOnly
            const res = await api.get('/superadmin/finance');
            
            if (res.data.success) {
                setData(res.data);
            }
        } catch (error: any) {
            console.error("Erreur Finance:", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                toast.error("Session expirée. Reconnexion requise.");
                router.push('/login');
            } else {
                toast.error("Impossible de charger les données financières.");
            }
        } finally {
            setLoading(false);
        }
    };

    fetchFinanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- RENDU : LOADING ---
  if (loading) return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617] text-white gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#F59E0B]"/>
        <p className="text-sm font-mono text-slate-500 animate-pulse">Audit des comptes en cours...</p>
      </div>
  );

  // --- LOGIQUE DE FILTRAGE ---
  const history = data?.history || [];
  const stats = data?.stats || { volume: 0, totalRevenue: 0, transactionCount: 0 };

  const filteredHistory = history.filter((h) => 
    h.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper pour le formatage monétaire
  const formatMoney = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount);

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-8 font-sans">
      
      {/* HEADER */}
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-[#F59E0B]/20">
                Super Admin
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">TRÉSORERIE GLOBALE 💰</h1>
          <p className="text-slate-400 text-sm mt-1">Suivi consolidé des flux financiers, commissions et reversements.</p>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* BLOC 1 : VOLUME D'AFFAIRES (GMV) */}
        <div className="bg-[#0B1120] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition">
                <Wallet className="w-20 h-20 text-slate-400" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Volume Total Encaissé</p>
            <p className="text-3xl font-black text-white">
                {formatMoney(stats.volume)} <span className="text-sm font-normal text-slate-600">FCFA</span>
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <AlertCircle className="w-3 h-3" /> Argent transité (Brut)
            </div>
        </div>

        {/* BLOC 2 : REVENU NET (CA REEL) */}
        <div className="bg-gradient-to-br from-[#F59E0B] to-orange-700 p-6 rounded-3xl text-white shadow-2xl shadow-orange-900/20 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110">
                <DollarSign className="w-24 h-24 text-white" />
            </div>
            <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-2">Chiffre d'Affaires Net</p>
            <p className="text-4xl font-black">
                {formatMoney(stats.totalRevenue)} <span className="text-lg">F</span>
            </p>
            <div className="flex items-center gap-2 mt-4 text-[10px] bg-black/20 backdrop-blur-sm w-fit px-3 py-1.5 rounded-full border border-white/10">
                <TrendingUp className="w-3 h-3" /> {stats.transactionCount} transactions validées
            </div>
        </div>

        {/* BLOC 3 : MARGE */}
        <div className="bg-[#0B1120] p-6 rounded-3xl border border-blue-500/10 relative overflow-hidden group hover:border-blue-500/30 transition">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition">
                <Activity className="w-20 h-20 text-blue-500" />
            </div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Marge Moyenne</p>
            <p className="text-3xl font-black text-white">
               {(stats.volume > 0 ? ((stats.totalRevenue / stats.volume) * 100) : 0).toFixed(1)} <span className="text-sm">%</span>
            </p>
            <p className="text-xs text-slate-500 mt-4">Part conservée sur chaque flux.</p>
        </div>

      </div>

      {/* ✅ MODULE DE DISTRIBUTION DES DIVIDENDES */}
      <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <DividendDistributor />
      </div>

      {/* TABLEAU HISTORIQUE */}
      <div className="bg-[#0B1120] border border-white/5 rounded-3xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Journal des Encaissements
            </h3>
            
            <div className="relative w-full md:w-72 group">
                <Search className="absolute left-3 top-3 text-slate-600 group-focus-within:text-[#F59E0B] transition w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Rechercher (Locataire, Bien...)" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#020617] border border-white/10 rounded-xl py-2.5 pl-10 text-sm focus:border-[#F59E0B] outline-none text-white transition-all placeholder:text-slate-600"
                />
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.02] text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                        <th className="p-4 pl-6">Date</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Détails de la transaction</th>
                        <th className="p-4 text-right">Montant Total</th>
                        <th className="p-4 text-right pr-6 text-[#F59E0B]">Commission</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition group">
                            <td className="p-4 pl-6 text-slate-500 font-mono text-xs">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 opacity-50" />
                                    {new Date(item.date).toLocaleDateString()}
                                </div>
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${
                                    item.type === 'LOYER' 
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                }`}>
                                    {item.type}
                                </span>
                            </td>
                            <td className="p-4">
                                <p className="font-bold text-slate-200 text-sm">{item.details}</p>
                                <p className="text-[10px] text-emerald-500 mt-0.5 flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3" /> Payé via Mobile Money
                                </p>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-slate-300">
                                {formatMoney(item.amount)} F
                            </td>
                            <td className="p-4 text-right pr-6 font-mono text-[#F59E0B] font-bold group-hover:text-[#fbbf24] transition">
                                + {formatMoney(item.commission)} F
                            </td>
                        </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                        <tr><td colSpan={5} className="p-16 text-center text-slate-500 italic">Aucune transaction trouvée pour cette recherche.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
