'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation'; // ✅ Pour rafraîchir les données après retrait
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Wallet, ShieldCheck, Bell, Lock, X, ArrowDownLeft 
} from 'lucide-react';
import { toast } from 'sonner';

// ✅ IMPORTS DES MODULES
import LogoutButton from './LogoutButton';
import DocumentsCard from './DocumentsCard';
import NewsFeed from './NewsFeed';
import WithdrawModal from './WithdrawModal'; // ✅ Le nouveau module de retrait

// Définition des types étendus pour TypeScript
interface ExtendedUser {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
  walletBalance: number;
  backerTier: string | null;
  transactions: any[];
  investmentContracts: any[];
}

interface DashboardViewProps {
  user: ExtendedUser;
}

export default function DashboardView({ user }: DashboardViewProps) {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<'6M' | '1Y'>('1Y');
  const [showNotifs, setShowNotifs] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false); // ✅ État du modal retrait

  // --- 1. ALGORITHME DE CALCUL DU GRAPHIQUE ---
  const chartData = useMemo(() => {
    // Si pas de transactions, on affiche une ligne plate
    if (!user.transactions || user.transactions.length === 0) {
        return [
            { date: 'Début', solde: 0 },
            { date: 'Auj.', solde: user.walletBalance }
        ];
    }

    let runningBalance = 0;
    // On doit trier les transactions par date croissante pour construire le graphique
    const sortedTx = [...user.transactions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const data = sortedTx.map(tx => {
        if (tx.type === 'CREDIT') runningBalance += tx.amount;
        else if (tx.type === 'DEBIT') runningBalance -= tx.amount;
        
        return {
            date: new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            solde: runningBalance,
        };
    });

    // On ajoute le point actuel final si nécessaire
    if (data.length > 0) {
        data.push({
            date: 'Actuel',
            solde: user.walletBalance
        });
    }

    return data;
  }, [user.transactions, user.walletBalance]);

  // --- 2. ACTIONS ---
  const handleReinvest = () => {
    toast.info("Un conseiller VIP va vous contacter.", {
        description: "Merci de votre confiance renouvelée."
    });
  };

  const handleWithdrawSuccess = () => {
      // On rafraîchit les données serveur (Next.js Server Actions / ISR)
      router.refresh(); 
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-6 md:p-10 relative" onClick={() => setShowNotifs(false)}>
      
      {/* ================= HEADER ================= */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black uppercase tracking-widest mb-3">
             <ShieldCheck className="w-3 h-3" /> Actionnaire Vérifié
           </div>
           <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
             Bonjour, {user.name?.split(' ')[0] || 'Partenaire'}
           </h1>
           <p className="text-slate-500 text-sm mt-1">
             Pack <span className="text-[#F59E0B] font-bold">{user.backerTier || 'Investisseur'}</span> • Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'})}
           </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
            {/* --- Notifications --- */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => setShowNotifs(!showNotifs)}
                    className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition relative group"
                >
                    <Bell className={`w-5 h-5 ${showNotifs ? 'text-white' : 'text-slate-400'} group-hover:text-white transition`} />
                    {/* Badge rouge si notifs (simulé) */}
                    <span className="absolute top-2 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </button>
                
                {/* Dropdown Menu */}
                {showNotifs && (
                    <div className="absolute right-0 top-full mt-4 w-80 bg-[#0B1120] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <h4 className="font-bold text-white text-sm">Notifications</h4>
                            <button onClick={() => setShowNotifs(false)}><X className="w-4 h-4 text-slate-500"/></button>
                        </div>
                        <div className="p-2 max-h-64 overflow-y-auto space-y-1">
                            <div className="p-3 hover:bg-white/5 rounded-xl transition cursor-pointer flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-4 h-4 text-[#F59E0B]"/>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">Dividendes T1</p>
                                    <p className="text-[10px] text-slate-500">Distribution prévue le 15 Juin.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ BOUTON RETIRER (NOUVEAU) */}
            <button 
                onClick={() => setIsWithdrawOpen(true)}
                className="px-5 py-3 bg-[#0B1120] border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 transition flex items-center gap-2 text-sm"
            >
                <ArrowDownLeft className="w-4 h-4 text-slate-400" /> <span className="hidden sm:inline">Retirer</span>
            </button>

            {/* Bouton Réinvestir */}
            <button 
                onClick={handleReinvest}
                className="px-5 py-3 bg-[#F59E0B] text-[#020617] font-bold rounded-xl hover:bg-orange-500 transition shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center gap-2 text-sm"
            >
                <TrendingUp className="w-4 h-4" /> <span className="hidden sm:inline">Réinvestir</span>
            </button>

            {/* BOUTON DÉCONNEXION */}
            <LogoutButton />
        </div>
      </header>

      {/* ================= GRID PRINCIPAL ================= */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- COLONNE GAUCHE (KPIs & Finance) --- */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* 1. KPIs Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Capital */}
                <div className="bg-[#0B1120] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-[#F59E0B]/30 transition duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#F59E0B]/10 rounded-lg text-[#F59E0B]"><Wallet className="w-5 h-5" /></div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Solde Wallet</p>
                    </div>
                    <p className="text-2xl font-black text-white">
                        {user.walletBalance.toLocaleString('fr-FR')} <span className="text-sm font-medium text-slate-500">FCFA</span>
                    </p>
                </div>

                {/* Valeur Projetée */}
                <div className="bg-[#0B1120] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><TrendingUp className="w-5 h-5" /></div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Valeur Projetée</p>
                    </div>
                    <p className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                        {(user.walletBalance * 1.15).toLocaleString('fr-FR')} <span className="text-[10px] bg-emerald-500/10 px-2 py-1 rounded-full text-emerald-500 font-bold">+15%</span>
                    </p>
                </div>

                {/* Lock-up */}
                <div className="bg-[#0B1120] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Lock className="w-5 h-5" /></div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Lock-up Period</p>
                    </div>
                    <p className="text-2xl font-black text-white">12 <span className="text-sm font-medium text-slate-500">Mois</span></p>
                </div>
            </div>

            {/* 2. Graphique Financier */}
            <div className="bg-[#0B1120] border border-white/5 rounded-3xl p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="font-bold text-white text-lg">Performance du Portefeuille</h3>
                        <p className="text-xs text-slate-500">Mise à jour en temps réel</p>
                    </div>
                    <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                        <button className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#F59E0B] text-black shadow-lg">1 An</button>
                    </div>
                </div>
                
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                stroke="#475569" 
                                tick={{fontSize: 11}} 
                                tickLine={false} 
                                axisLine={false} 
                                dy={10}
                            />
                            <YAxis 
                                stroke="#475569" 
                                tick={{fontSize: 11}} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(val) => `${val/1000}k`} 
                            />
                            <Tooltip 
                                contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'}} 
                                itemStyle={{color: '#F59E0B'}} 
                                formatter={(value: number) => [`${value.toLocaleString()} FCFA`, 'Solde']}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="solde" 
                                stroke="#F59E0B" 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorValue)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* --- COLONNE DROITE (Modules) --- */}
        <div className="space-y-8 flex flex-col h-full">
            
            {/* MODULE DOCUMENTS */}
            <div className="flex-1 min-h-[250px]">
                <DocumentsCard 
                    contracts={user.investmentContracts} 
                    user={user} 
                />
            </div>

            {/* MODULE ACTUALITÉS */}
            <div className="flex-1 min-h-[300px]">
                <NewsFeed />
            </div>
        </div>

      </div>

      {/* ✅ MODAL DE RETRAIT (Invisible par défaut) */}
      <WithdrawModal 
        isOpen={isWithdrawOpen} 
        onClose={() => setIsWithdrawOpen(false)} 
        userBalance={user.walletBalance}
        onSuccess={handleWithdrawSuccess}
      />

    </div>
  );
}
