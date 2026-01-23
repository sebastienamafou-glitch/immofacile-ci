"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  Users, Wallet, AlertTriangle, ShieldAlert, CheckCircle, 
  Search, Plus, Eye, ArrowUpRight, Activity, Server, CreditCard, 
  LogOut, Loader2, Building2
} from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

// Enregistrement des composants graphiques
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- TYPES SÉCURISÉS (PROD STRICT) ---
interface DashboardData {
    success: boolean;
    stats: {
        totalRevenue: number;
        users: number;
        agencies: number;
        assets: number;
        incidents: number;
        kycCount: number;
    };
    lists: {
        // CORRECTION : On reste sur 'docUrl' car c'est ce que renvoie /api/superadmin/dashboard
        pendingKycs: Array<{ id: string; name: string; role: string; docUrl: string | null }>;
        logs: Array<{ id: string; action: string; user?: string; date: string }>;
        owners: Array<{ id: string; name: string; email: string; walletBalance: number }>;
    };
}

// --- COMPOSANT UI : KPI CARD ---
const KpiCard = ({ title, value, icon: Icon, colorClass, trend, subtext }: any) => (
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
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  </div>
);

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  // États du Guichet (Rechargement Manuel)
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [searchOwner, setSearchOwner] = useState("");
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  // 1. CHARGEMENT DES DONNÉES (REAL FETCH)
  useEffect(() => {
    const fetchData = async () => {
        try {
            const stored = localStorage.getItem("immouser");
            if (!stored) { router.push('/login'); return; }
            const user = JSON.parse(stored);

            // Appel API Réel vers le Dashboard Stats
            const res = await fetch('/api/superadmin/dashboard', {
                headers: { 'x-user-email': user.email }
            });
            
            if (res.status === 401 || res.status === 403) {
                router.push('/login');
                return;
            }

            const json = await res.json();
            
            if (json.success) {
                setData(json);
            } else {
                console.error("Erreur API:", json.error);
            }

        } catch (e) {
            console.error("Erreur connexion:", e);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [router]);

  // 2. ACTION : CRÉER UNE AGENCE (REAL FETCH)
  const handleCreateAgency = () => {
    Swal.fire({
        title: 'Nouvelle Agence Partenaire',
        html: `
            <div class="space-y-3 text-left">
                <div>
                    <label class="text-xs text-slate-400 uppercase font-bold">Nom de l'agence</label>
                    <input id="swal-agency" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-orange-500 outline-none" placeholder="Ex: Immo Prestige">
                </div>
                <div>
                    <label class="text-xs text-slate-400 uppercase font-bold">Email Administrateur</label>
                    <input id="swal-email" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-orange-500 outline-none" placeholder="directeur@agence.ci">
                </div>
                <div>
                    <label class="text-xs text-slate-400 uppercase font-bold">Téléphone</label>
                    <input id="swal-phone" class="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-orange-500 outline-none" placeholder="0707...">
                </div>
            </div>
        `,
        focusConfirm: false,
        background: '#020617', color: '#fff',
        showCancelButton: true, confirmButtonColor: '#F59E0B', confirmButtonText: 'Générer Accès',
        preConfirm: () => {
            const agencyName = (document.getElementById('swal-agency') as HTMLInputElement).value;
            const adminEmail = (document.getElementById('swal-email') as HTMLInputElement).value;
            const adminPhone = (document.getElementById('swal-phone') as HTMLInputElement).value;
            
            if (!agencyName || !adminEmail) {
                Swal.showValidationMessage('Nom et Email requis');
                return false;
            }
            // Génération simple du slug pour l'URL
            const agencySlug = agencyName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
            
            return { agencyName, agencySlug, adminName: "Admin " + agencyName, adminEmail, adminPhone };
        }
    }).then(async (result) => {
        if (result.isConfirmed && result.value) {
            try {
                const stored = localStorage.getItem("immouser");
                const userEmail = stored ? JSON.parse(stored).email : "";

                // APPEL API RÉEL
                const res = await fetch('/api/superadmin/agencies/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail },
                    body: JSON.stringify(result.value)
                });

                const json = await res.json();

                if (res.ok) {
                    Swal.fire({ 
                        icon: 'success', title: 'Agence Créée !', 
                        html: `Identifiants:<br/><b>${json.credentials.email}</b><br/>Pass: <code>${json.credentials.tempPassword}</code>`, 
                        background: '#020617', color: '#fff' 
                    });
                    // Mise à jour locale du compteur
                    if (data) setData({ ...data, stats: { ...data.stats, agencies: data.stats.agencies + 1 } });
                } else {
                    Swal.fire({ icon: 'error', title: 'Erreur', text: json.error, background: '#020617', color: '#fff' });
                }
            } catch (e) {
                Swal.fire({ icon: 'error', title: 'Erreur Serveur', background: '#020617', color: '#fff' });
            }
        }
    });
  };

  // 3. ACTION : CRÉDITER UN COMPTE (REAL FETCH)
  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwnerId || !creditAmount) return;

    const confirm = await Swal.fire({
        title: 'Confirmer Transaction',
        html: `Créditer <b>${parseInt(creditAmount).toLocaleString()} F</b> ?<br/><span class="text-xs text-slate-400">Action irréversible.</span>`,
        icon: 'warning', showCancelButton: true, confirmButtonText: 'Oui, Créditer', confirmButtonColor: '#F59E0B', background: '#020617', color: '#fff'
    });

    if (confirm.isConfirmed) {
        setIsSubmittingCredit(true);
        try {
            const stored = localStorage.getItem("immouser");
            const userEmail = stored ? JSON.parse(stored).email : "";

            // APPEL API RÉEL
            const res = await fetch('/api/superadmin/users/credit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail },
                body: JSON.stringify({ 
                    ownerId: selectedOwnerId, 
                    amount: parseInt(creditAmount) 
                })
            });

            const json = await res.json();

            if (res.ok) {
                // Mise à jour optimiste de l'UI
                if (data) {
                    const updatedOwners = data.lists.owners.map(o => 
                        o.id === selectedOwnerId ? { ...o, walletBalance: (o.walletBalance || 0) + parseInt(creditAmount) } : o
                    );
                    setData({ ...data, lists: { ...data.lists, owners: updatedOwners } });
                }
                setCreditAmount(""); setSelectedOwnerId("");
                Swal.fire({ icon: 'success', title: 'Compte Crédité', timer: 1500, showConfirmButton: false, background: '#020617', color: '#fff' });
            } else {
                Swal.fire({ icon: 'error', title: 'Echec', text: json.error || 'Impossible de créditer.', background: '#020617', color: '#fff' });
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Erreur Réseau', background: '#020617', color: '#fff' });
        } finally {
            setIsSubmittingCredit(false);
        }
    }
  };

  // 4. ACTION : VALIDER KYC (CORRIGÉE : PUT /api/superadmin/kyc)
  const handleValidateKyc = async (id: string, name: string) => {
    const confirm = await Swal.fire({
        title: 'Validation KYC', text: `Valider le dossier de ${name} ?`, icon: 'question',
        showCancelButton: true, confirmButtonColor: '#10B981', confirmButtonText: 'Valider', background: '#020617', color: '#fff'
    });

    if (confirm.isConfirmed) {
        try {
            const stored = localStorage.getItem("immouser");
            const userEmail = stored ? JSON.parse(stored).email : "";

            // ✅ C'est ici la correction majeure pour s'aligner sur votre KYCroute.ts
            const res = await fetch('/api/superadmin/kyc', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail },
                body: JSON.stringify({ userId: id, status: 'VERIFIED' })
            });

            if (res.ok) {
                if (data) {
                    setData({
                        ...data,
                        stats: { ...data.stats, kycCount: Math.max(0, data.stats.kycCount - 1) },
                        lists: { ...data.lists, pendingKycs: data.lists.pendingKycs.filter(k => k.id !== id) }
                    });
                }
                Swal.fire({ icon: 'success', title: 'Validé', timer: 1000, showConfirmButton: false, background: '#020617', color: '#fff' });
            } else {
                Swal.fire({ icon: 'error', title: 'Erreur', text: 'Validation échouée', background: '#020617', color: '#fff' });
            }
        } catch (e) {
            console.error(e);
        }
    }
  };

  if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div>;
  if (!data) return null;

  // Filtrage pour le guichet
  const filteredOwners = data.lists.owners?.filter(o => (o.name || "").toLowerCase().includes(searchOwner.toLowerCase())) || [];

  // Config Graphique (Données réelles du revenu global simulées sur une courbe pour l'instant car pas d'historique renvoyé par l'API)
  const chartData = {
    labels: ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin'],
    datasets: [{
        label: 'Revenus Plateforme',
        data: [data.stats.totalRevenue * 0.4, data.stats.totalRevenue * 0.5, data.stats.totalRevenue * 0.6, data.stats.totalRevenue * 0.8, data.stats.totalRevenue * 0.9, data.stats.totalRevenue],
        borderColor: '#F59E0B',
        backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, "rgba(245, 158, 11, 0.2)");
            gradient.addColorStop(1, "rgba(245, 158, 11, 0)");
            return gradient;
        },
        fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0
    }]
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-orange-500/30 pb-20">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Server className="text-white w-5 h-5" />
                </div>
                <div>
                    <h1 className="font-bold text-white tracking-tight text-lg">ImmoFacile <span className="text-slate-500 font-normal">Command Center</span></h1>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Système Opérationnel</span>
                    </div>
                </div>
            </div>
            <button onClick={() => { localStorage.removeItem("immouser"); router.push('/login'); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition">
                <LogOut className="w-5 h-5" />
            </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-8">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="Revenu Global" value={`${data.stats.totalRevenue.toLocaleString()} F`} icon={Wallet} colorClass="text-amber-500" trend="+12.5%" />
            <KpiCard title="Agences SaaS" value={data.stats.agencies} icon={Building2} colorClass="text-purple-500" subtext="Partenaires B2B" />
            <KpiCard title="Parc Immobilier" value={data.stats.assets} icon={Server} colorClass="text-blue-500" subtext="Biens & Annonces" />
            <KpiCard title="KYC en Attente" value={data.stats.kycCount} icon={ShieldAlert} colorClass={data.stats.kycCount > 0 ? "text-orange-500 animate-pulse" : "text-slate-500"} />
        </div>

        {/* MAIN SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* GAUCHE (2/3) */}
            <div className="xl:col-span-2 space-y-8">
                
                {/* 1. CHART & ACTIONS */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 relative overflow-hidden backdrop-blur-md">
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h2 className="text-xl font-bold text-white">Performance Financière</h2>
                            <p className="text-sm text-slate-500">Flux de revenus agrégés</p>
                        </div>
                        <button onClick={handleCreateAgency} className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition">
                            <Plus className="w-4 h-4" /> Créer Agence
                        </button>
                    </div>
                    <div className="h-[300px] w-full relative z-10">
                        <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false } } }} />
                    </div>
                </div>

                {/* 2. GUICHET DE RECHARGEMENT */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-1 shadow-2xl">
                    <div className="bg-[#020617]/80 p-6 rounded-[20px]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-orange-500 rounded-lg text-black"><CreditCard className="w-5 h-5" /></div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Guichet Express</h2>
                                <p className="text-xs text-slate-400">Rechargement manuel de compte (Cash/Virement)</p>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6">
                            <form onSubmit={handleAddCredit} className="flex-1 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Bénéficiaire</label>
                                    <select value={selectedOwnerId} onChange={(e) => setSelectedOwnerId(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none" required>
                                        <option value="">Sélectionner...</option>
                                        {data.lists.owners?.map((o: any) => (
                                            <option key={o.id} value={o.id}>{o.name} ({o.walletBalance.toLocaleString()} F)</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Montant (FCFA)</label>
                                    <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white focus:border-orange-500 outline-none" placeholder="0" required />
                                </div>
                                <button type="submit" disabled={isSubmittingCredit} className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 rounded-xl transition shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSubmittingCredit ? "TRAITEMENT..." : "CRÉDITER"}
                                </button>
                            </form>
                            
                            {/* Liste Rapide */}
                            <div className="flex-1 border-l border-slate-800 pl-6 hidden lg:block">
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                    <input type="text" placeholder="Rechercher..." value={searchOwner} onChange={(e) => setSearchOwner(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 py-2 text-xs text-white outline-none" />
                                </div>
                                <div className="space-y-2 h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredOwners.map((o: any) => (
                                        <div key={o.id} onClick={() => setSelectedOwnerId(o.id)} 
                                            className={`p-2 rounded border cursor-pointer flex justify-between ${selectedOwnerId === o.id ? 'bg-orange-500/10 border-orange-500' : 'border-slate-800 hover:bg-slate-800'}`}>
                                            <span className="text-xs font-bold text-slate-300">{o.name}</span>
                                            <span className="text-xs font-mono text-slate-500">{o.walletBalance.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* DROITE (1/3) */}
            <div className="space-y-6">
                
                {/* 1. KYC WIDGET (CORRIGÉ & ALIGNÉ AVEC ROUTE.TS) */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-orange-500" /> KYC ({data.lists.pendingKycs.length})
                        </h3>
                    </div>
                    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                        {data.lists.pendingKycs.length === 0 ? <p className="text-center text-xs text-slate-500">Aucun dossier.</p> : 
                            data.lists.pendingKycs.map((k: any) => (
                                <div key={k.id} className="p-3 bg-slate-800/20 rounded-xl border border-white/5">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-bold text-white">{k.name}</span>
                                        <span className="text-[10px] text-slate-400 uppercase bg-slate-800 px-1 rounded">{k.role}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* On utilise docUrl pour l'affichage (renvoyé par route.ts stats) */}
                                        {k.docUrl && (
                                            <a href={k.docUrl} target="_blank" className="flex-1 bg-slate-800 text-slate-300 text-xs py-1.5 rounded flex items-center justify-center gap-1 hover:bg-slate-700">
                                                <Eye className="w-3 h-3"/> Voir
                                            </a>
                                        )}
                                        <button onClick={() => handleValidateKyc(k.id, k.name)} className="flex-1 bg-emerald-500/10 text-emerald-500 text-xs py-1.5 rounded flex items-center justify-center gap-1 hover:bg-emerald-500 hover:text-white transition">
                                            <CheckCircle className="w-3 h-3"/> Valider
                                        </button>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* 2. LOGS ACTIVITY */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="p-5 border-b border-slate-800 bg-slate-950/30">
                        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-500" /> Activité
                        </h3>
                    </div>
                    <div className="p-4 space-y-4">
                        {data.lists.logs.slice(0, 5).map((log: any) => (
                            <div key={log.id} className="flex gap-3 items-start">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                <div>
                                    <p className="text-xs text-slate-300"><span className="font-bold text-white">{log.user || 'Système'}</span> {log.action}</p>
                                    <p className="text-[10px] text-slate-600 font-mono">{new Date(log.date).toLocaleDateString()}</p>
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
