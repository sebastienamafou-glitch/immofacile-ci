"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, Wallet, ArrowUpRight, Plus, 
  Building2, FileText, LayoutDashboard, LogOut, PieChart, Loader2 
} from "lucide-react";
import { api } from "@/lib/api"; // ✅ Wrapper Sécurisé

interface Investment {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    // Note: Dans votre schema actuel, 'InvestmentContract' n'a pas de 'projectName' ou 'roiRate' explicites.
    // Je suppose ici qu'ils sont stockés ou dérivés du 'packName'.
    packName?: string; 
}

interface Stats {
    totalInvested: number;
    activeCount: number;
}

export default function InvestorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalInvested: 0, activeCount: 0 });
  const [investments, setInvestments] = useState<Investment[]>([]);

  useEffect(() => {
    const loadData = async () => {
        try {
            // ✅ APPEL SÉCURISÉ (Cookie auto)
            // Note: Vous devrez créer cet endpoint GET '/api/investor/dashboard'
            // qui retourne { stats, investments } basé sur 'x-user-id'
            const res = await api.get('/investor/dashboard'); 
            
            if (res.data.success) {
                setStats(res.data.stats);
                setInvestments(res.data.investments);
            }
        } catch (error: any) {
            console.error("Dashboard Load Error", error);
            if (error.response?.status === 401) router.push('/login');
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-sm font-mono text-slate-500">Chargement du portefeuille...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-200 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-800 p-6 hidden lg:flex flex-col fixed h-full bg-[#0B1120] z-10">
        <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-white">I</div>
            <span className="text-xl font-bold text-white tracking-tight">INVEST<span className="text-indigo-500">.CLUB</span></span>
        </div>
        
        <nav className="space-y-2 flex-1">
            <Link href="/investor/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-medium">
                <LayoutDashboard className="w-5 h-5" /> Vue d'ensemble
            </Link>
            <Link href="/investor/opportunities" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition font-medium">
                <PieChart className="w-5 h-5" /> Opportunités
            </Link>
        </nav>

        <button onClick={() => router.push('/login')} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-white hover:bg-red-500/10 rounded-xl transition font-bold text-sm">
            <LogOut className="w-5 h-5" /> Déconnexion
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6 lg:p-10 lg:ml-64">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
                <h1 className="text-3xl font-black text-white">Mon Portefeuille</h1>
                <p className="text-slate-400 mt-1">Suivez la performance de vos placements immobiliers.</p>
            </div>
            <Link href="/investor/opportunities">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-indigo-900/30 transition-transform active:scale-95">
                    <Plus className="w-5 h-5 mr-2" /> Explorer les projets
                </Button>
            </Link>
        </header>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Wallet className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Total Investi</span>
                    </div>
                    <p className="text-3xl font-black text-white">{stats.totalInvested.toLocaleString()} F</p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Contrats Actifs</span>
                    </div>
                    <p className="text-3xl font-black text-purple-500">{stats.activeCount}</p>
                </CardContent>
            </Card>
            {/* Carte ROI (Statique pour l'instant ou calculée si données dispos) */}
            <Card className="bg-slate-900 border-slate-800">
                 <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/10 text-green-500 rounded-lg"><ArrowUpRight className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase">ROI Moyen Estimé</span>
                    </div>
                    <p className="text-3xl font-black text-green-500">~ 12.5 %</p>
                </CardContent>
            </Card>
        </div>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" /> Mes Contrats
        </h2>

        <div className="space-y-4">
            {investments.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                    <p className="text-slate-500">Vous n'avez aucun investissement actif.</p>
                </div>
            ) : (
                investments.map(inv => (
                    <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition duration-300 group relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                            
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-indigo-400 text-xl border border-slate-700">
                                    {(inv.packName || "I").charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{inv.packName || "Contrat Investisseur"}</h3>
                                    <p className="text-xs text-slate-500 font-mono">Date : {new Date(inv.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="flex gap-8 text-center w-full md:w-auto justify-between md:justify-end items-center">
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Montant</p>
                                    <p className="font-bold text-slate-200">{inv.amount.toLocaleString()} F</p>
                                </div>
                                <div>
                                    <Badge className={`border-0 ${inv.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                        {inv.status}
                                    </Badge>
                                </div>
                                <Link href={`/investor/contract/${inv.id}`}>
                                    <Button variant="outline" size="icon" className="bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition">
                                        <FileText className="w-4 h-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

      </main>
    </div>
  );
}
