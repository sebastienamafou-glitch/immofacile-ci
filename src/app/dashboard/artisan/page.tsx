"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api"; 
import { toast } from "sonner";
import Swal from "sweetalert2";
import { 
  Hammer, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Wrench, // ✅ Ajouté (Correction de l'erreur)
  Clock   // ✅ Ajouté (Correction de l'erreur)
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// --- TYPES (Clean Code) ---
interface Job {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: string;
  address: string;
  reporterName?: string;
  reporterPhone?: string;
  quoteAmount?: number;
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

  // --- 1. DATA FETCHING ---
  const fetchDashboard = async () => {
    try {
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
             toast.error("Impossible de charger l'atelier.");
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
        // Optimistic UI Update (Mise à jour immédiate avant réponse serveur)
        setData({ ...data, user: { ...data.user, isAvailable: newStatus } });

        await api.post('/artisan/status', { available: newStatus });
        toast.success(newStatus ? "Vous êtes EN LIGNE." : "Vous êtes HORS LIGNE.");
    } catch (error) {
        toast.error("Erreur de connexion.");
        fetchDashboard(); // Rollback en cas d'erreur
    }
  };

  const handleJobAction = async (jobId: string, action: 'ACCEPT' | 'REJECT' | 'COMPLETE') => {
    // Confirmation spéciale pour la fin de chantier
    if (action === 'COMPLETE') {
        const confirm = await Swal.fire({
            title: 'Terminer le chantier ?',
            text: "Cela validera l'intervention et déclenchera le paiement.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#334155',
            confirmButtonText: 'Oui, travaux finis',
            cancelButtonText: 'Annuler',
            background: '#0f172a', color: '#fff'
        });
        if (!confirm.isConfirmed) return;
    }

    try {
        await api.post(`/artisan/jobs/action`, { jobId, action });

        if (action === 'ACCEPT') toast.success("Chantier accepté !");
        if (action === 'REJECT') toast.info("Offre déclinée.");
        if (action === 'COMPLETE') {
            Swal.fire({ 
                title: 'Excellent travail !', 
                text: 'Intervention validée avec succès.', 
                icon: 'success', 
                background: '#0f172a', color: '#fff',
                timer: 2000, showConfirmButton: false
            });
        }

        fetchDashboard(); // Rafraîchir les données

    } catch (error: any) {
        toast.error(error.response?.data?.error || "Action impossible pour le moment.");
    }
  };

  if (loading) return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 text-white min-h-[500px]">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-slate-500 font-mono text-sm">Chargement de l'atelier...</p>
    </div>
  );

  if (!data) return null;

  const { user, stats, jobs } = data;

  return (
    <div className="p-6 md:p-10 font-sans text-slate-200">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
                <h1 className="text-3xl font-black text-white mb-2">Bonjour, {user.name}</h1>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-orange-500 text-orange-500 bg-orange-500/10">Artisan Certifié</Badge>
                    
                    {/* Toggle Disponibilité */}
                    <button 
                        onClick={toggleAvailability} 
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold transition-all ${user.isAvailable ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-600 bg-slate-800 text-slate-400'}`}
                    >
                        <div className={`w-2 h-2 rounded-full ${user.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        {user.isAvailable ? 'DISPONIBLE' : 'HORS LIGNE'}
                    </button>
                </div>
            </div>
            
            {/* Wallet Widget */}
            <div className="text-left md:text-right bg-slate-900 p-4 rounded-xl border border-slate-800 md:border-none md:bg-transparent md:p-0">
                <p className="text-xs font-bold text-slate-500 uppercase">Solde Portefeuille</p>
                <p className="text-3xl font-black text-white tracking-tight">{user.walletBalance.toLocaleString()} F</p>
            </div>
        </header>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-slate-900 border-slate-800 shadow-lg hover:border-slate-700 transition">
                <CardContent className="p-6">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Missions Réalisées</p>
                    <p className="text-3xl font-black text-white">{stats.jobsCount}</p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 shadow-lg hover:border-slate-700 transition">
                <CardContent className="p-6">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Note Moyenne</p>
                    <p className="text-3xl font-black text-yellow-400">{stats.rating}/5</p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 shadow-lg hover:border-slate-700 transition">
                <CardContent className="p-6">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Gains Totaux</p>
                    <p className="text-3xl font-black text-emerald-400">{stats.earnings.toLocaleString()} F</p>
                </CardContent>
            </Card>
        </div>

        {/* SECTION CHANTIERS */}
        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
            <Hammer className="text-orange-500 w-6 h-6"/> 
            <h2 className="text-xl font-bold text-white">Tableau de bord des interventions</h2>
        </div>
        
        <div className="space-y-4">
            {jobs.length === 0 ? (
                // EMPTY STATE
                <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                    <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Aucune intervention en cours.</p>
                    <p className="text-xs text-slate-600 mt-1">Restez disponible, les missions arrivent !</p>
                </div>
            ) : (
                // JOB LIST
                jobs.map(job => (
                    <Card key={job.id} className="bg-slate-900 border-slate-800 text-slate-200 hover:border-orange-500/30 transition-all duration-300">
                        <CardContent className="p-6 flex flex-col lg:flex-row gap-6">
                            
                            {/* INFO GAUCHE */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <Badge className={`${job.status === 'IN_PROGRESS' ? 'bg-blue-600' : 'bg-emerald-600'} text-white border-none`}>
                                        {job.status === 'IN_PROGRESS' ? 'EN COURS' : 'NOUVELLE DEMANDE'}
                                    </Badge>
                                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                        <Clock className="w-3 h-3"/> {new Date(job.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{job.title}</h3>
                                <p className="text-slate-400 text-sm mb-4 flex items-center gap-2 font-medium bg-black/20 w-fit px-3 py-1.5 rounded-lg border border-slate-800">
                                    <MapPin className="w-4 h-4 text-orange-500"/> {job.address}
                                </p>
                                
                                {job.status === 'IN_PROGRESS' && (
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm grid grid-cols-2 gap-4 max-w-md">
                                        <div>
                                            <p className="font-bold text-slate-500 text-xs uppercase mb-1">Contact sur place</p>
                                            <p className="text-white font-bold">{job.reporterName || "Non spécifié"}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-500 text-xs uppercase mb-1">Téléphone</p>
                                            <p className="text-orange-400 font-mono font-bold select-all cursor-pointer hover:underline">{job.reporterPhone || "Non renseigné"}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ACTIONS DROITE */}
                            <div className="flex flex-col items-end justify-center gap-4 min-w-[220px] border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
                                <div className="text-right w-full">
                                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Budget Estimé</p>
                                    <p className="text-2xl font-black text-white tracking-tight">{job.quoteAmount ? `${job.quoteAmount.toLocaleString()} F` : 'Sur devis'}</p>
                                </div>

                                {job.status === 'OPEN' && (
                                    <div className="grid grid-cols-2 gap-2 w-full">
                                        <Button onClick={() => handleJobAction(job.id, 'ACCEPT')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 h-10">
                                            <CheckCircle className="w-4 h-4 mr-2"/> Accepter
                                        </Button>
                                        <Button onClick={() => handleJobAction(job.id, 'REJECT')} variant="outline" className="border-slate-700 bg-transparent text-slate-400 hover:text-white hover:bg-white/5 h-10">
                                            <XCircle className="w-4 h-4 mr-2"/> Refuser
                                        </Button>
                                    </div>
                                )}
                                
                                {job.status === 'IN_PROGRESS' && (
                                    <Button onClick={() => handleJobAction(job.id, 'COMPLETE')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/20 h-11">
                                        <CheckCircle className="w-4 h-4 mr-2"/> Valider la fin
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    </div>
  );
}
