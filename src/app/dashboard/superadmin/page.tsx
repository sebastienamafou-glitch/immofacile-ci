"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Swal from "sweetalert2";
import {
  Users, Wallet, ShieldAlert, Server, LogOut, Loader2, Building2, 
  Hammer, Plane, AlertCircle, TrendingUp, CreditCard, CheckCircle, Eye,
  Megaphone, Send, ShieldCheck, XCircle, FileText
} from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { api } from "@/lib/api";

// Enregistrement ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- COMPOSANTS UI ---

const KpiCard = ({ title, value, icon: Icon, colorClass, subtext }: any) => (
  <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 group relative overflow-hidden shadow-xl">
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500 ${colorClass.replace('text-', 'bg-')}`}></div>
    <div className="flex justify-between items-start z-10">
      <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 group-hover:scale-110 transition-transform ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    <div className="mt-4 z-10">
      <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
      {subtext && <p className="text-xs text-slate-500 mt-1 font-mono">{subtext}</p>}
    </div>
  </div>
);

// --- PAGE PRINCIPALE ---

export default function WarRoomDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  
  // États Guichet Trésorerie
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  // CHARGEMENT INITIAL
  useEffect(() => {
    const fetchData = async () => {
        try {
            const res = await api.get('/superadmin/dashboard');
            if (res.data.success) setData(res.data);
        } catch (e: any) {
            console.error("Erreur Dashboard Admin", e);
            if (e.response?.status === 401 || e.response?.status === 403) router.push('/login');
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [router]);

  // --- ACTIONS ---

  // 1. BROADCAST (MESSAGE GÉNÉRAL) 📢
  const handleBroadcast = () => {
    Swal.fire({
      title: '📢 CENTRE DE DIFFUSION',
      html: `
        <div class="text-left space-y-4 font-sans text-sm p-2">
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Cible</label>
            <select id="swal-target" class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:border-orange-500 transition">
              <option value="ALL">Tout le monde (Global)</option>
              <option value="TENANT">Locataires uniquement</option>
              <option value="OWNER">Propriétaires uniquement</option>
              <option value="ARTISAN">Artisans uniquement</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4">
             <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                <select id="swal-type" class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:border-orange-500 transition">
                  <option value="INFO">Information 🔵</option>
                  <option value="WARNING">Alerte 🔴</option>
                  <option value="SUCCESS">Succès 🟢</option>
                </select>
             </div>
             <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Titre</label>
                <input id="swal-title" placeholder="Ex: Maintenance" class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:border-orange-500 transition">
             </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Message</label>
            <textarea id="swal-message" placeholder="Votre message..." class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 h-24 outline-none focus:border-orange-500 transition"></textarea>
          </div>
        </div>
      `,
      background: '#0F172A', color: '#fff',
      showCancelButton: true,
      confirmButtonText: 'Envoyer maintenant',
      confirmButtonColor: '#F59E0B',
      cancelButtonText: 'Annuler',
      cancelButtonColor: '#334155',
      customClass: { popup: 'rounded-[2rem] border border-slate-700' },
      preConfirm: () => {
        return {
          targetRole: (document.getElementById('swal-target') as HTMLSelectElement).value,
          type: (document.getElementById('swal-type') as HTMLSelectElement).value,
          title: (document.getElementById('swal-title') as HTMLInputElement).value,
          message: (document.getElementById('swal-message') as HTMLTextAreaElement).value
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await api.post('/superadmin/notifications/broadcast', result.value);
          Swal.fire({
             icon: 'success', 
             title: 'Diffusion Réussie', 
             text: `${res.data.count} utilisateurs ont reçu la notification.`,
             background: '#0F172A', color: '#fff',
             confirmButtonColor: '#10B981'
          });
        } catch (e) {
          Swal.fire({ icon: 'error', title: 'Erreur', text: "Échec de l'envoi", background: '#0F172A', color: '#fff' });
        }
      }
    });
  };

  // 2. KYC VALIDATION (Le Coeur du système)
  const handleValidateKyc = async (userId: string, userName: string) => {
    const result = await Swal.fire({
        title: 'Valider ce dossier ?',
        text: `Vous allez certifier l'identité de ${userName}. Cette action débloquera ses droits.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, Certifier',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#334155',
        background: '#0F172A', color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            await api.put('/superadmin/kyc', { userId, status: 'VERIFIED' });
            
            // Mise à jour Optimiste de l'UI
            setData((prev: any) => ({
                ...prev,
                stats: { 
                    ...prev.stats, 
                    ops: { ...prev.stats.ops, kycCount: Math.max(0, prev.stats.ops.kycCount - 1) } 
                },
                lists: { 
                    ...prev.lists, 
                    pendingKycs: prev.lists.pendingKycs.filter((k: any) => k.id !== userId) 
                }
            }));

            Swal.fire({ 
                icon: 'success', 
                title: 'Utilisateur Certifié !', 
                toast: true, position: 'top-end', 
                showConfirmButton: false, timer: 2000, 
                background: '#0F172A', color: '#fff' 
            });

        } catch (e) { 
            Swal.fire({ icon: 'error', title: 'Erreur Serveur', background: '#0F172A', color: '#fff' }); 
        }
    }
  };

  const handleRejectKyc = async (userId: string) => {
      const { value: reason } = await Swal.fire({
        title: 'Refuser le dossier',
        input: 'text',
        inputLabel: 'Motif du rejet',
        inputPlaceholder: 'Ex: Document illisible, expiré...',
        showCancelButton: true,
        confirmButtonText: 'Refuser',
        confirmButtonColor: '#EF4444',
        background: '#0F172A', color: '#fff',
        inputValidator: (value) => {
            if (!value) return 'Le motif est obligatoire !'
        }
      });

      if (reason) {
        try {
            await api.put('/superadmin/kyc', { userId, status: 'REJECTED', reason });
             setData((prev: any) => ({
                ...prev,
                stats: { ...prev.stats, ops: { ...prev.stats.ops, kycCount: Math.max(0, prev.stats.ops.kycCount - 1) } },
                lists: { ...prev.lists, pendingKycs: prev.lists.pendingKycs.filter((k: any) => k.id !== userId) }
            }));
            Swal.fire({ icon: 'info', title: 'Dossier Rejeté', toast: true, position: 'top-end', timer: 2000, background: '#0F172A', color: '#fff' });
        } catch (e) {
             Swal.fire({ icon: 'error', title: 'Erreur', background: '#0F172A', color: '#fff' });
        }
      }
  };

  // 3. CREDIT GUICHET
  const handleAddCredit = async () => {
    if (!selectedOwnerId || !creditAmount) return;
    setIsSubmittingCredit(true);
    try {
        await api.post('/superadmin/users/credit', { ownerId: selectedOwnerId, amount: parseInt(creditAmount) });
        Swal.fire({ icon: 'success', title: 'Compte Crédité', text: `${parseInt(creditAmount).toLocaleString()} F ajoutés.`, timer: 2000, showConfirmButton: false, background: '#020617', color: '#fff' });
        setCreditAmount("");
    } catch (e) { 
        Swal.fire({ icon: 'error', title: 'Erreur', text: "Impossible de créditer le compte.", background: '#020617', color: '#fff' }); 
    }
    finally { setIsSubmittingCredit(false); }
  };

  // --- RENDU ---

  if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-12 h-12"/></div>;
  if (!data) return null;

  // Données Graphique (Simulées ou Réelles)
  const chartData = {
    labels: ['J-5', 'J-4', 'J-3', 'J-2', 'Hier', 'Auj'],
    datasets: [{
        label: 'Flux Financier (FCFA)',
        data: [12000, 19000, 3000, 5000, 20000, data.stats.revenue.shortTerm], 
        borderColor: '#F59E0B', backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, "rgba(245, 158, 11, 0.4)");
            gradient.addColorStop(1, "rgba(245, 158, 11, 0)");
            return gradient;
        },
        fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6
    }]
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-24 selection:bg-orange-500/30">
      
      {/* --- HEADER COMMAND CENTER --- */}
      <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20 border border-white/10">
                    <Server className="text-white w-5 h-5" />
                </div>
                <div>
                    <h1 className="font-black text-white text-lg tracking-tight uppercase">ImmoFacile <span className="text-orange-500">War Room</span></h1>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Système Opérationnel</p>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <button 
                    onClick={handleBroadcast}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition border border-slate-700 hover:border-slate-600"
                >
                    <Megaphone className="w-4 h-4 text-orange-500" /> <span className="hidden sm:inline">Envoyer Alertes</span>
                </button>

                <div className="h-8 w-[1px] bg-slate-800"></div>

                <button onClick={() => router.push('/logout')} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition group" title="Déconnexion">
                    <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-6 space-y-8">
        
        {/* LIGNE 1 : KPI STRATÉGIQUES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            <KpiCard title="Trésorerie Globale" value={`${data.stats.revenue.total.toLocaleString()} F`} subtext={`+${data.stats.revenue.shortTerm.toLocaleString()} F (Semaine)`} icon={Wallet} colorClass="text-emerald-500" />
            <KpiCard title="Incidents Critiques" value={data.stats.ops.incidentsCount} subtext="Intervention requise" icon={ShieldAlert} colorClass="text-red-500" />
            <KpiCard title="Artisans Disponibles" value={data.stats.hr.artisansReady} subtext="Sur 12 zones couvertes" icon={Hammer} colorClass="text-blue-500" />
            <KpiCard title="Akwaba Live" value={data.stats.assets.activeBookings} subtext="Voyageurs hébergés" icon={Plane} colorClass="text-purple-500" />
        </div>

        {/* LIGNE 2 : OPÉRATIONS & FLUX */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE (LARGE) */}
            <div className="xl:col-span-2 space-y-8">
                
                {/* GRAPHIQUE */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-white flex items-center gap-2"><TrendingUp className="text-orange-500 w-6 h-6"/> Flux Financier Temps Réel</h2>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-400 uppercase">24H</span>
                            <span className="px-3 py-1 bg-orange-500/20 text-orange-500 rounded-full text-[10px] font-bold uppercase">7 Jours</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <Line data={chartData} options={{ maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false, beginAtZero: true } }, plugins: { legend: { display: false } } }} />
                    </div>
                </div>

                {/* GUICHET TRÉSORERIE */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-500"/> Guichet Rapide (Crédit manuel)
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <select onChange={(e) => setSelectedOwnerId(e.target.value)} value={selectedOwnerId} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 outline-none focus:border-emerald-500 transition appearance-none">
                                <option value="">Choisir un bénéficiaire...</option>
                                {data.lists.owners.map((o: any) => (
                                    <option key={o.id} value={o.id}>{o.name} (Solde actuel: {o.walletBalance.toLocaleString()} F)</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-4 pointer-events-none text-slate-500">▼</div>
                        </div>
                        <div className="relative w-full sm:w-48">
                            <input type="number" placeholder="Montant" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-emerald-500 transition pl-8" />
                            <span className="absolute left-3 top-4 text-slate-500 font-bold">F</span>
                        </div>
                        <button onClick={handleAddCredit} disabled={isSubmittingCredit} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-xl transition text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]">
                            {isSubmittingCredit ? <Loader2 className="animate-spin w-4 h-4"/> : "Créditer"}
                        </button>
                    </div>
                </div>
            </div>

            {/* COLONNE DROITE (ACTION RAPIDE) */}
            <div className="space-y-6">
                
                {/* MAINTENANCE LIVE */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl min-h-[200px]">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[60px] rounded-full pointer-events-none"></div>
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-white text-sm flex items-center gap-2"><AlertCircle className="text-red-500 w-4 h-4"/> MAINTENANCE</h3>
                        <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[10px] font-black">{data.lists.criticalIncidents.length}</span>
                     </div>
                     
                     <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {data.lists.criticalIncidents.length > 0 ? data.lists.criticalIncidents.map((inc: any) => (
                            <div key={inc.id} className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/10 transition cursor-pointer group">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-red-400 uppercase truncate max-w-[150px]">{inc.title}</span>
                                    <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">URGENT</span>
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                     <Building2 className="w-3 h-3"/> {inc.property?.title || "Bien inconnu"}
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2 opacity-50">
                                <ShieldCheck className="w-10 h-10"/>
                                <span className="text-xs font-bold">Système Stable</span>
                            </div>
                        )}
                     </div>
                </div>

                {/* ✅ GESTION KYC (CENTRE DE VALIDATION) */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-white text-sm flex gap-2 items-center">
                            <ShieldCheck className="text-orange-500 w-4 h-4"/> VALIDATION KYC
                        </h3>
                        <span className="bg-orange-500 text-black px-2 py-0.5 rounded text-[10px] font-black">{data.stats.ops.kycCount}</span>
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {data.lists.pendingKycs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 opacity-50">
                                <CheckCircle className="w-12 h-12"/>
                                <span className="text-xs font-bold">Tout est à jour</span>
                            </div>
                        ) : (
                            data.lists.pendingKycs.map((k: any) => (
                                <div key={k.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-3 group hover:border-orange-500/30 transition">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-sm text-white">{k.name}</div>
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded w-fit mt-1">{k.role}</div>
                                        </div>
                                        {/* Lien vers document */}
                                        {k.kyc?.documents && k.kyc.documents.length > 0 && (
                                            <a 
                                                href={k.kyc.documents[0]} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-2 bg-slate-800 rounded-lg hover:bg-blue-600 hover:text-white text-slate-400 transition"
                                                title="Voir la pièce d'identité"
                                            >
                                                <Eye className="w-4 h-4"/>
                                            </a>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <button 
                                            onClick={() => handleRejectKyc(k.id)} 
                                            className="flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-2 rounded-lg text-[10px] font-bold uppercase transition"
                                        >
                                            <XCircle className="w-3 h-3"/> Rejeter
                                        </button>
                                        <button 
                                            onClick={() => handleValidateKyc(k.id, k.name)} 
                                            className="flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white py-2 rounded-lg text-[10px] font-bold uppercase transition"
                                        >
                                            <CheckCircle className="w-3 h-3"/> Valider
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
      </main>
    </div>
  );
}
