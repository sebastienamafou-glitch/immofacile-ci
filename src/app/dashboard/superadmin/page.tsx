"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  Users, Wallet, ShieldAlert, Server, LogOut, Loader2, Building2, 
  Hammer, Plane, AlertCircle, TrendingUp, CreditCard, CheckCircle, Eye,
  Megaphone, Send // ✅ Ajout icônes
} from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { api } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- COMPOSANTS UI ---
const KpiCard = ({ title, value, icon: Icon, colorClass, subtext }: any) => (
  <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 group relative overflow-hidden">
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

export default function WarRoomDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  
  // États Guichet
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const res = await api.get('/superadmin/dashboard');
            if (res.data.success) setData(res.data);
        } catch (e: any) {
            if (e.response?.status === 401 || e.response?.status === 403) router.push('/login');
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [router]);

  // --- ACTIONS ---

  // 1. BROADCAST (NOUVEAU) 📢
  const handleBroadcast = () => {
    Swal.fire({
      title: '📢 DIFFUSION GÉNÉRALE',
      html: `
        <div class="text-left space-y-4 font-sans text-sm">
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Cible</label>
            <select id="swal-target" class="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 outline-none focus:border-orange-500">
              <option value="ALL">Tout le monde (Global)</option>
              <option value="TENANT">Locataires uniquement</option>
              <option value="OWNER">Propriétaires uniquement</option>
              <option value="ARTISAN">Artisans uniquement</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
            <select id="swal-type" class="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 outline-none focus:border-orange-500">
              <option value="INFO">Information (Bleu)</option>
              <option value="WARNING">Alerte (Rouge)</option>
              <option value="SUCCESS">Succès (Vert)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Titre</label>
            <input id="swal-title" placeholder="Ex: Maintenance Prévue" class="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 outline-none focus:border-orange-500">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
            <textarea id="swal-message" placeholder="Votre message..." class="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 h-24 outline-none focus:border-orange-500"></textarea>
          </div>
        </div>
      `,
      background: '#0F172A', color: '#fff',
      showCancelButton: true,
      confirmButtonText: 'Envoyer le message',
      confirmButtonColor: '#F59E0B',
      cancelButtonText: 'Annuler',
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
          // APPEL API
          const res = await api.post('/superadmin/notifications/broadcast', result.value);
          Swal.fire({
             icon: 'success', 
             title: 'Envoyé !', 
             text: `${res.data.count} utilisateurs notifiés.`,
             background: '#0F172A', color: '#fff' 
          });
        } catch (e) {
          Swal.fire({ icon: 'error', title: 'Erreur', text: "Échec de l'envoi", background: '#0F172A', color: '#fff' });
        }
      }
    });
  };

  // 2. KYC VALIDATION
  const handleValidateKyc = async (id: string) => {
    try {
        await api.put('/superadmin/kyc', { userId: id, status: 'VERIFIED' });
        setData((prev: any) => ({
            ...prev,
            stats: { ...prev.stats, ops: { ...prev.stats.ops, kycCount: prev.stats.ops.kycCount - 1 } },
            lists: { ...prev.lists, pendingKycs: prev.lists.pendingKycs.filter((k: any) => k.id !== id) }
        }));
        Swal.fire({ icon: 'success', title: 'Validé', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, background: '#0F172A', color: '#fff' });
    } catch (e) { Swal.fire({ icon: 'error', title: 'Erreur', background: '#0F172A', color: '#fff' }); }
  };

  // 3. CREDIT GUICHET
  const handleAddCredit = async () => {
    if (!selectedOwnerId || !creditAmount) return;
    setIsSubmittingCredit(true);
    try {
        await api.post('/superadmin/users/credit', { ownerId: selectedOwnerId, amount: parseInt(creditAmount) });
        Swal.fire({ icon: 'success', title: 'Crédité !', timer: 1500, showConfirmButton: false, background: '#020617', color: '#fff' });
        setCreditAmount("");
    } catch (e) { Swal.fire({ icon: 'error', title: 'Erreur', background: '#020617', color: '#fff' }); }
    finally { setIsSubmittingCredit(false); }
  };

  if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div>;
  if (!data) return null;

  const chartData = {
    labels: ['J-5', 'J-4', 'J-3', 'J-2', 'Hier', 'Auj'],
    datasets: [{
        label: 'Flux Financier',
        data: [12000, 19000, 3000, 5000, 20000, data.stats.revenue.shortTerm], 
        borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.4
    }]
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-20 selection:bg-orange-500/30">
      
      {/* --- HEADER DE COMMANDEMENT --- */}
      <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20">
                    <Server className="text-white w-5 h-5" />
                </div>
                <div>
                    <h1 className="font-black text-white text-lg tracking-tight">TOUR DE CONTRÔLE</h1>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Système Opérationnel</p>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                {/* ✅ LE BOUTON BROADCAST */}
                <button 
                    onClick={handleBroadcast}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-blue-900/20"
                >
                    <Megaphone className="w-4 h-4" /> Message Général
                </button>

                <button onClick={() => router.push('/logout')} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-8">
        
        {/* LIGNE 1 : KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="Trésorerie Totale" value={`${data.stats.revenue.total.toLocaleString()} F`} subtext={`Dont ${data.stats.revenue.shortTerm.toLocaleString()} F via Akwaba`} icon={Wallet} colorClass="text-emerald-500" />
            <KpiCard title="Incidents Actifs" value={data.stats.ops.incidentsCount} subtext={`${data.lists.criticalIncidents.length} urgences critiques`} icon={AlertCircle} colorClass="text-red-500" />
            <KpiCard title="Force Artisanale" value={data.stats.hr.artisansReady} subtext="Artisans connectés & dispos" icon={Hammer} colorClass="text-blue-500" />
            <KpiCard title="Akwaba Live" value={data.stats.assets.activeBookings} subtext="Réservations en cours" icon={Plane} colorClass="text-purple-500" />
        </div>

        {/* LIGNE 2 : OPERATIONS */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
                    <h2 className="text-xl font-black text-white flex items-center gap-2 mb-6"><TrendingUp className="text-orange-500"/> Flux de Revenus</h2>
                    <div className="h-[250px] w-full"><Line data={chartData} options={{ maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false } } }} /></div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Guichet Trésorerie</h2>
                    <div className="flex gap-4">
                        <select onChange={(e) => setSelectedOwnerId(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 outline-none focus:border-orange-500 transition">
                            <option value="">Sélectionner un bénéficiaire...</option>
                            {data.lists.owners.map((o: any) => <option key={o.id} value={o.id}>{o.name} (Solde: {o.walletBalance} F)</option>)}
                        </select>
                        <input type="number" placeholder="Montant" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} className="w-40 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-orange-500 transition" />
                        <button onClick={handleAddCredit} disabled={isSubmittingCredit} className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 rounded-xl transition text-xs uppercase tracking-wider">{isSubmittingCredit ? <Loader2 className="animate-spin"/> : "Créditer"}</button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 blur-[40px] rounded-full"></div>
                     <h3 className="font-black text-white text-sm mb-4 flex items-center gap-2"><AlertCircle className="text-red-500 w-4 h-4"/> MAINTENANCE ({data.lists.criticalIncidents.length})</h3>
                     <div className="space-y-3">
                        {data.lists.criticalIncidents.length > 0 ? data.lists.criticalIncidents.map((inc: any) => (
                            <div key={inc.id} className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-red-500/10 transition">
                                <div><div className="text-xs font-bold text-red-400 uppercase">{inc.title}</div>
                                <div className="text-[10px] text-slate-500">
                                 {inc.property?.title || "Bien non spécifié"}
                            </div>
                            </div>
                                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded font-bold">URGENT</span>
                            </div>
                        )) : <div className="text-center py-4 text-slate-500 text-xs italic">Aucune urgence.</div>}
                     </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <h3 className="font-black text-white text-sm mb-4 flex gap-2"><ShieldAlert className="text-orange-500 w-4 h-4"/> KYC PENDING ({data.stats.ops.kycCount})</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {data.lists.pendingKycs.map((k: any) => (
                            <div key={k.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                                <div><div className="font-bold text-sm text-white">{k.name}</div><div className="text-[10px] text-slate-500 uppercase">{k.role}</div></div>
                                <div className="flex gap-2">
                                    {k.docUrl && <a href={k.docUrl} target="_blank" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-300"><Eye className="w-3 h-3"/></a>}
                                    <button onClick={() => handleValidateKyc(k.id)} className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition"><CheckCircle className="w-3 h-3"/></button>
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
