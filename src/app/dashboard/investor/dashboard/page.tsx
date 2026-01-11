"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Pour la redirection
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, Wallet, ArrowUpRight, Plus, 
  Building2, FileText, LayoutDashboard, LogOut, PieChart 
} from "lucide-react";

export default function InvestorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Stats fictives (en attendant l'API réelle)
  const [stats, setStats] = useState({
    totalInvested: 2500000,
    averageRoi: 12.5,
    projectedEarnings: 312500
  });

  const [investments, setInvestments] = useState([
    {
      id: "inv1", // ID fictif pour lier au contrat
      projectName: "Rénovation Immeuble Plateau",
      amount: 1000000,
      roiRate: 15,
      startDate: "2023-11-01",
      duration: 12,
      status: "ACTIVE"
    },
    {
      id: "inv2",
      projectName: "Construction Villa Bassam",
      amount: 1500000,
      roiRate: 10,
      startDate: "2023-12-15",
      duration: 24,
      status: "PENDING"
    }
  ]);

  useEffect(() => {
    // Simulation de vérification de session
    const token = localStorage.getItem('token');
    if (!token) {
        // En prod, décommenter : router.push('/login');
    }
    setLoading(false);
  }, [router]);

  if (loading) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-white">Chargement...</div>;

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-200 font-sans">
      
      {/* --- SIDEBAR INVESTISSEUR --- */}
      <aside className="w-64 border-r border-slate-800 p-6 hidden lg:flex flex-col fixed h-full bg-[#0B1120] z-10">
        <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-white">I</div>
            <span className="text-xl font-bold text-white tracking-tight">INVEST<span className="text-indigo-500">.CLUB</span></span>
        </div>
        
        <nav className="space-y-2 flex-1">
            <Link href="/investor/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-medium">
                <LayoutDashboard className="w-5 h-5" /> Vue d'ensemble
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition font-medium">
                <PieChart className="w-5 h-5" /> Opportunités
            </Link>
        </nav>

        <button onClick={() => router.push('/login')} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-white hover:bg-red-500/10 rounded-xl transition font-bold text-sm">
            <LogOut className="w-5 h-5" /> Déconnexion
        </button>
      </aside>

      {/* --- CONTENU PRINCIPAL --- */}
      <main className="flex-1 p-6 lg:p-10 lg:ml-64">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
                <h1 className="text-3xl font-black text-white">Mon Portefeuille</h1>
                <p className="text-slate-400 mt-1">Suivez la performance de vos placements immobiliers.</p>
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-indigo-900/30 transition-transform active:scale-95">
                <Plus className="w-5 h-5 mr-2" /> Explorer les projets
            </Button>
        </header>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
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
                        <span className="text-xs font-bold text-slate-400 uppercase">ROI Moyen</span>
                    </div>
                    <p className="text-3xl font-black text-purple-500">{stats.averageRoi} %</p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/10 text-green-500 rounded-lg"><ArrowUpRight className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Gains Projetés</span>
                    </div>
                    <p className="text-3xl font-black text-green-500">+{stats.projectedEarnings.toLocaleString()} F</p>
                </CardContent>
            </Card>
        </div>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" /> Mes Projets Actifs
        </h2>

        <div className="space-y-4">
            {investments.map(inv => (
                <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition duration-300 group relative overflow-hidden">
                    {/* Effet hover léger */}
                    <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                        
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-indigo-400 text-xl border border-slate-700">
                                {inv.projectName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{inv.projectName}</h3>
                                <p className="text-xs text-slate-500 font-mono">Début : {new Date(inv.startDate).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="flex gap-8 text-center w-full md:w-auto justify-between md:justify-end items-center">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Montant</p>
                                <p className="font-bold text-slate-200">{inv.amount.toLocaleString()} F</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Taux</p>
                                <p className="font-bold text-purple-400">{inv.roiRate} %</p>
                            </div>
                            <div>
                                <Badge className={`border-0 ${inv.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                    {inv.status === 'ACTIVE' ? 'ACTIF' : 'EN ATTENTE'}
                                </Badge>
                            </div>
                            
                            {/* Bouton vers le Contrat */}
                            <Link href={`/investor/contract/${inv.id}`}>
                                <Button variant="outline" size="icon" className="bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition">
                                    <FileText className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>

                    </div>
                </div>
            ))}
        </div>

      </main>
    </div>
  );
}
