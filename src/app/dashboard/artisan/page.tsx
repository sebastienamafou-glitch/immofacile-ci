"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api"; 
import { toast } from "sonner";
import Swal from "sweetalert2";
import Link from "next/link";
import { 
  Hammer, Download, MapPin, CheckCircle, 
  XCircle, Clock, LayoutDashboard, LogOut, Wrench, Loader2 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// On parle d'Incidents (Réparations) pour les Artisans
interface Job {
  id: string;
  title: string;
  description: string;
  status: string; // OPEN, IN_PROGRESS, RESOLVED
  priority: string;
  address: string; // Adresse du bien
  reporterName?: string;
  reporterPhone?: string;
  quoteAmount?: number; // Montant du devis/intervention
  createdAt: string;
}

interface ArtisanStats {
  jobsCount: number;
  rating: number;
  earnings: number;
}

interface ArtisanData {
  user: {
    name: string;
    email: string;
    walletBalance: number;
    isAvailable: boolean;
  };
  stats: ArtisanStats;
  jobs: Job[];
}

export default function ArtisanDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ArtisanData | null>(null);

  // --- 1. CHARGEMENT (Sécurisé par Cookie) ---
  const fetchDashboard = async () => {
    try {
        // ✅ Plus de headers manuels ici
        const res = await api.get('/artisan/dashboard');

        if (res.data.success) {
            setData(res.data);
        }
    } catch (error: any) {
        console.error("Erreur Dashboard:", error);
        if (error.response?.status === 401) {
             toast.error("Session expirée.");
             router.push('/login');
        } else {
             toast.error("Impossible de charger les données.");
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // --- 2. ACTIONS ---

  const toggleAvailability = async () => {
    if (!data) return;
    try {
        const newStatus = !data.user.isAvailable;
        // Optimistic Update
        setData({ ...data, user: { ...data.user, isAvailable: newStatus } });

        await api.post('/artisan/status', { available: newStatus });
        toast.success(newStatus ? "Vous êtes EN LIGNE." : "Vous êtes HORS LIGNE.");
    } catch (error) {
        toast.error("Erreur connexion serveur.");
        fetchDashboard(); // Rollback
    }
  };

  const handleJobAction = async (jobId: string, action: 'ACCEPT' | 'REJECT' | 'COMPLETE') => {
    
    if (action === 'COMPLETE') {
        const confirm = await Swal.fire({
            title: 'Chantier terminé ?',
            text: "Cela validera l'intervention et le paiement.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Oui, terminer',
            cancelButtonText: 'Annuler',
            background: '#0f172a', color: '#fff'
        });
        if (!confirm.isConfirmed) return;
    }

    try {
        await api.post(`/artisan/jobs/action`, { jobId, action });

        if (action === 'ACCEPT') toast.success("Chantier accepté !");
        if (action === 'REJECT') toast.info("Offre déclinée.");
        if (action === 'COMPLETE') Swal.fire({ 
            title: 'Beau travail !', 
            text: 'Intervention validée.', 
            icon: 'success', 
            background: '#0f172a', color: '#fff',
            timer: 2000, showConfirmButton: false
        });

        fetchDashboard(); 

    } catch (error: any) {
        toast.error(error.response?.data?.error || "Action impossible.");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
    </div>
  );

  if (!data) return null;

  const { user, stats, jobs } = data;

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-200 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-800 p-6 hidden lg:flex flex-col fixed h-full bg-[#0B1120] z-10">
        <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center font-black text-white">P</div>
            <span className="text-xl font-bold text-white tracking-tight">IMMO<span className="text-orange-500">.PRO</span></span>
        </div>
        <nav className="space-y-2 flex-1">
            <Button variant="ghost" className="w-full justify-start text-orange-500 bg-orange-500/10 font-bold"><LayoutDashboard className="w-4 h-4 mr-2"/> Chantiers</Button>
            <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white"><Wrench className="w-4 h-4 mr-2"/> Profil & Services</Button>
        </nav>
        <Button variant="ghost" onClick={() => router.push('/login')} className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"><LogOut className="w-4 h-4 mr-2"/> Déconnexion</Button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6 md:p-10 lg:ml-64 pb-20">
        <header className="flex justify-between items-end mb-10">
            <div>
                <h1 className="text-3xl font-black text-white mb-2">Bonjour, {user.name}</h1>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-orange-500 text-orange-500">Artisan Certifié</Badge>
                    <button onClick={toggleAvailability} className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold transition-all ${user.isAvailable ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-600 bg-slate-800 text-slate-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${user.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        {user.isAvailable ? 'DISPONIBLE' : 'HORS LIGNE'}
                    </button>
                </div>
            </div>
            <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-slate-500 uppercase">Solde Portefeuille</p>
                <p className="text-3xl font-black text-white">{user.walletBalance.toLocaleString()} F</p>
            </div>
        </header>

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-slate-900 border-slate-800"><CardContent className="p-6">
                <p className="text-slate-500 text-xs font-bold uppercase">Missions Réalisées</p>
                <p className="text-2xl font-black text-white">{stats.jobsCount}</p>
            </CardContent></Card>
            <Card className="bg-slate-900 border-slate-800"><CardContent className="p-6">
                <p className="text-slate-500 text-xs font-bold uppercase">Note Moyenne</p>
                <p className="text-2xl font-black text-yellow-400">{stats.rating}/5</p>
            </CardContent></Card>
            <Card className="bg-slate-900 border-slate-800"><CardContent className="p-6">
                <p className="text-slate-500 text-xs font-bold uppercase">Gains Totaux</p>
                <p className="text-2xl font-black text-emerald-400">{stats.earnings.toLocaleString()} F</p>
            </CardContent></Card>
        </div>

        {/* LISTE JOBS */}
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Hammer className="text-orange-500"/> Tableau de bord des interventions</h2>
        
        <div className="space-y-4">
            {jobs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                    <p className="text-slate-500">Aucune intervention en cours.</p>
                </div>
            ) : (
                jobs.map(job => (
                    <Card key={job.id} className="bg-slate-900 border-slate-800 text-slate-200">
                        <CardContent className="p-6 flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className={job.status === 'IN_PROGRESS' ? 'bg-blue-600' : 'bg-slate-700'}>
                                        {job.status === 'IN_PROGRESS' ? 'EN COURS' : 'NOUVEAU'}
                                    </Badge>
                                    <span className="text-xs text-slate-500 font-mono">{new Date(job.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">{job.title}</h3>
                                <p className="text-slate-400 text-sm mb-4"><MapPin className="w-3 h-3 inline mr-1"/> {job.address}</p>
                                
                                {job.status === 'IN_PROGRESS' && (
                                    <div className="bg-slate-950 p-3 rounded border border-slate-800 text-sm">
                                        <p className="font-bold text-white mb-1">Contact Client :</p>
                                        <p>{job.reporterName} • <span className="text-orange-400 select-all">{job.reporterPhone}</span></p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-end justify-center gap-3 min-w-[200px]">
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-bold uppercase">Budget / Devis</p>
                                    <p className="text-xl font-black text-white">{job.quoteAmount ? `${job.quoteAmount.toLocaleString()} F` : 'Sur devis'}</p>
                                </div>

                                {job.status === 'OPEN' && (
                                    <div className="flex gap-2 w-full">
                                        <Button onClick={() => handleJobAction(job.id, 'ACCEPT')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"><CheckCircle className="w-4 h-4 mr-2"/> Accepter</Button>
                                        <Button onClick={() => handleJobAction(job.id, 'REJECT')} variant="outline" className="border-slate-700 text-slate-400 hover:text-white"><XCircle className="w-4 h-4"/></Button>
                                    </div>
                                )}
                                
                                {job.status === 'IN_PROGRESS' && (
                                    <Button onClick={() => handleJobAction(job.id, 'COMPLETE')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/20">
                                        <CheckCircle className="w-4 h-4 mr-2"/> Terminer le chantier
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
      </main>
    </div>
  );
}
