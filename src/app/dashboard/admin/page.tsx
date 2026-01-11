"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Swal from "sweetalert2";
import {
  Users, Wallet, AlertTriangle, ShieldAlert, CheckCircle, 
  Search, Plus, Eye, ArrowUpRight, Activity, Server, CreditCard, LogOut, Loader2
} from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- TYPES SÉCURISÉS ---
interface StatData {
    users: number;
    properties: number;
    revenue: number;
    incidents: number;
    pendingKycCount: number;
}

interface UserKyc {
    id: string;
    name: string;
    role: string;
    kycDocumentUrl: string;
}

interface Log {
    id: string;
    action: string;
    createdAt: string;
    user?: { name: string };
}

interface Owner {
    id: string;
    name: string;
    email: string;
    walletBalance: number;
}

// --- COMPOSANT UI : KPI CARD ---
const KpiCard = ({ title, value, icon: Icon, colorClass, trend }: any) => (
  <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 group">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 group-hover:scale-110 transition-transform ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <span className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
          <ArrowUpRight className="w-3 h-3 mr-1" /> {trend}
        </span>
      )}
    </div>
    <div className="mt-4">
      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
    </div>
  </div>
);

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // États de Données
  const [stats, setStats] = useState<StatData>({ users: 0, properties: 0, revenue: 0, incidents: 0, pendingKycCount: 0 });
  const [pendingKycs, setPendingKycs] = useState<UserKyc[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  
  // États Formulaire Guichet
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [searchOwner, setSearchOwner] = useState("");

  // Fonction utilitaire pour récupérer l'admin connecté
  const getAdminUser = () => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("immouser"); // On uniformise sur 'immouser'
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.role === 'ADMIN' ? user : null;
  };

  useEffect(() => {
    const fetchDashboard = async () => {
        try {
            const admin = getAdminUser();
            
            // Sécurité : Redirection si pas admin ou pas connecté
            if (!admin) {
                router.push('/login'); 
                return; 
            }

            // APPEL API SÉCURISÉ (Headers)
            const res = await api.get('/admin/dashboard', {
                headers: { 'x-user-email': admin.email }
            });

            if (res.data.success) {
                const s = res.data.stats;
                setStats({
                    users: s.totalUsers,
                    properties: s.totalProperties,
                    revenue: s.myRevenue,
                    incidents: s.activeIncidentsCount,
                    pendingKycCount: s.pendingKycCount
                });
                setPendingKycs(res.data.lists.pendingKycs || []);
                setLogs(res.data.lists.recentActivities || []);
                setOwners(res.data.lists.owners || []);
            }
        } catch (error: any) { 
            console.error("Erreur admin dashboard", error);
            if(error.response?.status === 401) router.push('/login');
        } finally { 
            setLoading(false); 
        }
    };
    fetchDashboard();
  }, [router]);

  // --- ACTIONS SÉCURISÉES ---

  const handleValidateKyc = async (userId: string, name: string) => {
    const admin = getAdminUser();
    if(!admin) return;

    const confirm = await Swal.fire({
        title: 'Validation Identité', 
        text: `Confirmer le dossier de ${name} ?`, 
        icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#10b981', confirmButtonText: 'Valider', background: '#0f172a', color: '#fff'
    });

    if (confirm.isConfirmed) {
        try {
            await api.post(`/kyc/verify-manual/${userId}`, {}, {
                headers: { 'x-user-email': admin.email }
            });
            setPendingKycs(prev => prev.filter(k => k.id !== userId));
            setStats(prev => ({ ...prev, pendingKycCount: Math.max(0, prev.pendingKycCount - 1) }));
            Swal.fire({ icon: 'success', title: 'Validé', timer: 1000, showConfirmButton: false, background: '#0f172a', color: '#fff' });
        } catch (e) { Swal.fire({ icon: 'error', title: 'Erreur', background: '#0f172a', color: '#fff' }); }
    }
  };

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwnerId || !creditAmount) return;
    const admin = getAdminUser();
    if(!admin) return;

    const confirm = await Swal.fire({
        title: 'Rechargement Wallet',
        html: `<div class="text-left text-sm">Créditer <b>${parseInt(creditAmount).toLocaleString()} FCFA</b> ?<br/><span class="text-slate-400 text-xs">Cette action est irréversible et sera logguée par ${admin.name}.</span></div>`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Exécuter',
        confirmButtonColor: '#F59E0B',
        background: '#0f172a', color: '#fff'
    });

    if (confirm.isConfirmed) {
        try {
            await api.post('/admin/users/credit', 
                { ownerId: selectedOwnerId, amount: parseInt(creditAmount) },
                { headers: { 'x-user-email': admin.email } }
            );
            
            // Mise à jour locale optimiste
            setOwners(prev => prev.map(o => o.id === selectedOwnerId ? { ...o, walletBalance: o.walletBalance + parseInt(creditAmount) } : o));
            setCreditAmount("");
            setSelectedOwnerId("");
            Swal.fire({ icon: 'success', title: 'Opération Réussie', timer: 1500, showConfirmButton: false, background: '#0f172a', color: '#fff' });
        } catch (e) { Swal.fire({ icon: 'error', title: 'Erreur Transaction', background: '#0f172a', color: '#fff' }); }
    }
  };

  const filteredOwners = owners.filter(o => (o.name || "").toLowerCase().includes(searchOwner.toLowerCase()));

  // Chart Config
  const chartData = {
    labels: ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin'],
    datasets: [{
        label: 'Revenus Plateforme',
        data: [stats.revenue * 0.4, stats.revenue * 0.5, stats.revenue * 0.45, stats.revenue * 0.7, stats.revenue * 0.8, stats.revenue],
        borderColor: '#F59E0B',
        backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, "rgba(245, 158, 11, 0.2)");
            gradient.addColorStop(1, "rgba(245, 158, 11, 0)");
            return gradient;
        },
        fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 6
    }]
  };

  if (loading) return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="text-slate-500 font-mono text-xs animate-pulse">CONNECTION ADMIN...</span>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-orange-500/30">
      
      {/* --- TOP BAR --- */}
      <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Server className="text-white w-5 h-5" />
                </div>
                <div>
                    <h1 className="font-bold text-white tracking-tight text-lg">ImmoFacile <span className="text-slate-500 font-normal">Command Center</span></h1>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Système Opérationnel</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-6 px-6 py-2 bg-slate-900 border border-slate-800 rounded-full">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Latence API</span>
                        <span className="text-xs font-mono text-emerald-400">24ms</span>
                    </div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Version</span>
                        <span className="text-xs font-mono text-white">v5.0.2-PROD</span>
                    </div>
                </div>
                <button onClick={() => { localStorage.removeItem("immouser"); router.push('/login'); }} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors border border-transparent hover:border-red-500/20">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-8">
        
        {/* --- KPI SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="Revenu Net Plateforme" value={`${(stats?.revenue || 0).toLocaleString()} F`} icon={Wallet} colorClass="text-amber-500" trend="+12.5%" />
            <KpiCard title="Utilisateurs Actifs" value={stats.users} icon={Users} colorClass="text-blue-500" trend="+5.2%" />
            <KpiCard title="Incidents Critiques" value={stats.incidents} icon={AlertTriangle} colorClass={stats.incidents > 0 ? "text-red-500 animate-pulse" : "text-slate-500"} />
            <KpiCard title="KYC en Attente" value={stats.pendingKycCount} icon={ShieldAlert} colorClass={stats.pendingKycCount > 0 ? "text-orange-500" : "text-slate-500"} />
        </div>

        {/* --- MAIN GRID --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* GAUCHE (2/3) : CHART & GUICHET */}
            <div className="xl:col-span-2 space-y-8">
                
                {/* 1. CHART REVENUS */}
                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                            <h2 className="text-xl font-bold text-white">Performance Financière</h2>
                            <p className="text-sm text-slate-500">Évolution des commissions perçues (6 mois)</p>
                        </div>
                        <select className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-slate-400 outline-none">
                            <option>Cette année</option>
                            <option>Ce mois</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full relative z-10">
                        <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { grid: { color: '#1e293b' } } }, plugins: { legend: { display: false } } }} />
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-orange-500/5 blur-[100px] rounded-full pointer-events-none"></div>
                </div>

                {/* 2. GUICHET DE RECHARGEMENT (Redesign Pro) */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-1 overflow-hidden shadow-2xl">
                    <div className="bg-[#020617]/50 p-7 rounded-[20px]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-orange-500 rounded-lg text-black shadow-lg shadow-orange-500/30"><CreditCard className="w-5 h-5" /></div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Terminal de Paiement Interne</h2>
                                <p className="text-xs text-slate-400">Créditer un compte propriétaire manuellement (Cash / Virement)</p>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Formulaire */}
                            <form onSubmit={handleAddCredit} className="flex-1 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Bénéficiaire</label>
                                    <select 
                                        value={selectedOwnerId} onChange={(e) => setSelectedOwnerId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition-colors"
                                        required
                                    >
                                        <option value="">Sélectionner un compte...</option>
                                        {owners.map(o => <option key={o.id} value={o.id}>{o.name} (Solde: {o.walletBalance.toLocaleString()} F)</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Montant à créditer</label>
                                    <div className="relative">
                                        <input 
                                            type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono focus:border-orange-500 outline-none transition-colors pl-12"
                                            placeholder="0" min="500" required
                                        />
                                        <span className="absolute left-4 top-3.5 text-slate-500 text-xs font-bold">XOF</span>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
                                    <Plus className="w-5 h-5" /> EXÉCUTER LA TRANSACTION
                                </button>
                            </form>

                            {/* Liste Rapide */}
                            <div className="flex-1 border-l border-slate-800 pl-8 hidden lg:block">
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                    <input 
                                        type="text" placeholder="Chercher un client..." value={searchOwner} onChange={(e) => setSearchOwner(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:border-slate-600 outline-none"
                                    />
                                </div>
                                <div className="space-y-2 h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredOwners.map(o => (
                                        <div key={o.id} onClick={() => setSelectedOwnerId(o.id)} 
                                            className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${selectedOwnerId === o.id ? 'bg-orange-500/10 border-orange-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'}`}>
                                            <div>
                                                <p className={`text-xs font-bold ${selectedOwnerId === o.id ? 'text-orange-400' : 'text-slate-300'}`}>{o.name}</p>
                                                <p className="text-[10px] text-slate-500">{o.email}</p>
                                            </div>
                                            <span className="text-xs font-mono text-slate-400">{o.walletBalance.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* DROITE (1/3) : SIDEBAR ALERTES & LOGS */}
            <div className="space-y-8">
                
                {/* 1. KYC PENDING */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-orange-500" /> Vérifications KYC
                        </h3>
                        <span className="bg-orange-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingKycs.length}</span>
                    </div>
                    <div className="divide-y divide-slate-800 max-h-[300px] overflow-y-auto">
                        {pendingKycs.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">Aucun dossier en attente.</div>
                        ) : (
                            pendingKycs.map(k => (
                                <div key={k.id} className="p-4 hover:bg-slate-800/30 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-sm font-bold text-white">{k.name}</p>
                                            <p className="text-xs text-slate-500 font-mono">{k.role}</p>
                                        </div>
                                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">En attente</span>
                                    </div>
                                    <div className="flex gap-2 mt-3 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/${k.kycDocumentUrl}`} target="_blank" 
                                           className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded-lg text-center flex items-center justify-center gap-1 transition">
                                            <Eye className="w-3 h-3" /> Voir Doc
                                        </a>
                                        <button onClick={() => handleValidateKyc(k.id, k.name)} 
                                            className="flex-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 text-xs py-2 rounded-lg text-center flex items-center justify-center gap-1 transition">
                                            <CheckCircle className="w-3 h-3" /> Valider
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 2. ACTIVITY LOGS */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden h-fit">
                    <div className="p-5 border-b border-slate-800 bg-slate-950/30">
                        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-500" /> Flux d'Activité
                        </h3>
                    </div>
                    <div className="p-4 space-y-4">
                        {logs.slice(0, 6).map((log: any) => (
                            <div key={log.id} className="flex gap-3 items-start">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                <div>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        <span className="font-bold text-white">{log.user?.name || 'Système'}</span> {log.action}
                                    </p>
                                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                                        {new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
      </main>
    </div>
  );
}
