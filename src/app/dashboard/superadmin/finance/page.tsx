"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { api } from "@/lib/api";
import { Wallet, TrendingUp, DollarSign, Calendar, Search, Activity, Loader2 } from "lucide-react";

export default function FinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fonction Auth Sécurisée
  const getAdminUser = () => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("immouser");
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.role === 'SUPER_ADMIN' ? user : null;
  };

  useEffect(() => {
    const fetchData = async () => {
        const admin = getAdminUser();
        if (!admin) { router.push('/login'); return; }

        try {
            const res = await api.get('/admin/finance', {
                headers: { 'x-user-email': admin.email }
            });
            if (res.data.success) setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500"/>
        <p className="text-sm font-mono text-slate-500">Audit des comptes en cours...</p>
      </div>
  );

  const filteredHistory = data?.history?.filter((h: any) => 
    (h.lease?.property?.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.type || "").toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const stats = data?.stats || {};

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-6 md:p-8 font-sans">
      
      <h1 className="text-3xl font-black mb-2 text-white">TRÉSORERIE GLOBALE 💰</h1>
      <p className="text-slate-400 text-sm mb-8">Suivi détaillé des flux et commissions de la plateforme.</p>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* BLOC 1 : VOLUME D'AFFAIRES */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
            <div className="absolute right-0 top-0 p-3 opacity-5">
                <Wallet className="w-16 h-16 text-slate-400" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Volume Total Encaissé</p>
            <p className="text-2xl font-black text-white">
                {/* ✅ SÉCURITÉ : || 0 */}
                {(stats.volume || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">FCFA</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-2">Flux brut transitant par la plateforme</p>
        </div>

        {/* BLOC 2 : REVENU NET (LE VÔTRE) */}
        <div className="bg-gradient-to-br from-[#F59E0B] to-orange-700 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 p-3 opacity-10">
                <DollarSign className="w-16 h-16 text-white" />
            </div>
            <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-1">Chiffre d'Affaires Net</p>
            <p className="text-3xl font-black">
                {/* ✅ SÉCURITÉ : || 0 */}
                {(stats.totalRevenue || 0).toLocaleString()} <span className="text-base">F</span>
            </p>
            <div className="flex items-center gap-2 mt-2 text-[10px] bg-white/20 w-fit px-2 py-1 rounded">
                <TrendingUp className="w-3 h-3" /> {stats.transactionCount || 0} paiements traités
            </div>
        </div>

        {/* BLOC 3 : STATS DIVERSES */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-blue-500/20 relative overflow-hidden">
            <div className="absolute right-0 top-0 p-3 opacity-10">
                <Activity className="w-16 h-16 text-blue-500" />
            </div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Marge Moyenne</p>
            <p className="text-2xl font-black text-white">
               {(stats.volume > 0 ? ((stats.totalRevenue / stats.volume) * 100) : 0).toFixed(1)} %
            </p>
            <p className="text-[10px] text-slate-500 mt-2">Part conservée sur chaque transaction</p>
        </div>

      </div>

      {/* HISTORIQUE DES TRANSACTIONS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-lg">Journal des Encaissements</h3>
            
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3.5 text-slate-500 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 text-sm focus:border-[#F59E0B] outline-none text-white transition-all"
                />
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Détail</th>
                        <th className="p-4 text-right">Montant Total</th>
                        <th className="p-4 text-right text-orange-400">Votre Part</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {filteredHistory.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition">
                            <td className="p-4 text-slate-400 font-mono text-xs">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 opacity-50" />
                                    {new Date(item.date || item.createdAt).toLocaleDateString()}
                                </div>
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                    item.type === 'LOYER' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                                }`}>
                                    {item.type}
                                </span>
                            </td>
                            <td className="p-4">
                                <p className="font-bold text-white">{item.lease?.property?.title || "Transaction Diverse"}</p>
                                <p className="text-xs text-slate-500">{item.lease?.tenant?.name || "N/A"}</p>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-slate-300">
                                {/* ✅ SÉCURITÉ : || 0 */}
                                {(item.amount || 0).toLocaleString()} F
                            </td>
                            <td className="p-4 text-right font-mono text-[#F59E0B] font-bold">
                                {/* ✅ CORRECTION : Si la part est undefined, on met 0 */}
                                + {(item.amountPlatform || 0).toLocaleString()} F
                            </td>
                        </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                        <tr><td colSpan={5} className="p-12 text-center text-slate-500 italic">Aucune transaction trouvée.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

    </div>
  );
}
