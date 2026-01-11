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

// --- TYPES STRICTS ---
interface Mission {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  address: string;
  clientName?: string;
  clientPhone?: string;
  amount: number;
  dateScheduled: string;
}

interface ArtisanStats {
  missionsCount: number;
  rating: number;
  monthlyEarnings: number;
}

interface ArtisanData {
  user: {
    name: string;
    email: string;
    walletBalance: number;
    isAvailable: boolean;
  };
  stats: ArtisanStats;
  missions: Mission[];
}

// Fonction utilitaire sécurisée pour récupérer l'utilisateur
const getArtisanUser = () => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("immouser");
  if (!stored) return null;
  return JSON.parse(stored);
};

export default function ArtisanDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // État global des données
  const [data, setData] = useState<ArtisanData | null>(null);

  // --- 1. CHARGEMENT DES DONNÉES SÉCURISÉ ---
  const fetchDashboard = async () => {
    const user = getArtisanUser();
    
    // Sécurité : Si pas connecté, redirection
    if (!user) {
        router.push('/login'); 
        return;
    }

    try {
        // Injection du header de sécurité OBLIGATOIRE
        const res = await api.get('/artisan/dashboard', {
            headers: { 'x-user-email': user.email }
        });

        if (res.data.success) {
            setData(res.data);
        } else {
            toast.error("Impossible de charger le tableau de bord.");
        }
    } catch (error: any) {
        console.error("Erreur Dashboard Artisan:", error);
        if (error.response?.status === 401) {
             toast.error("Session expirée.");
             router.push('/login');
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // --- 2. ACTIONS MÉTIER SÉCURISÉES ---

  // Changer la disponibilité
  const toggleAvailability = async () => {
    const user = getArtisanUser();
    if (!user || !data) return;

    try {
        const newStatus = !data.user.isAvailable;
        
        // Optimistic UI update (mise à jour visuelle immédiate)
        setData({ ...data, user: { ...data.user, isAvailable: newStatus } });

        await api.post('/artisan/status', 
            { available: newStatus },
            { headers: { 'x-user-email': user.email } }
        );
        toast.success(newStatus ? "Vous êtes maintenant visible." : "Vous êtes passé hors ligne.");
    } catch (error) {
        toast.error("Erreur lors du changement de statut.");
        fetchDashboard(); // Rollback en cas d'erreur
    }
  };

  // Gérer une mission (Accepter / Refuser / Terminer)
  const handleMissionAction = async (missionId: string, action: 'ACCEPT' | 'REJECT' | 'COMPLETE') => {
    const user = getArtisanUser();
    if (!user) return;

    // Confirmation pour Clôturer
    if (action === 'COMPLETE') {
        const confirm = await Swal.fire({
            title: 'Terminer le chantier ?',
            text: "Cela déclenchera la demande de paiement.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563EB',
            confirmButtonText: 'Oui, terminer',
            cancelButtonText: 'Annuler',
            background: '#1e293b',
            color: '#fff'
        });
        if (!confirm.isConfirmed) return;
    }

    try {
        await api.post(`/artisan/missions/action`, 
            { missionId, action }, 
            { headers: { 'x-user-email': user.email } }
        );

        if (action === 'ACCEPT') {
            Swal.fire({ icon: 'success', title: 'Mission Acceptée', text: 'Le client a été notifié.', timer: 2000, showConfirmButton: false, background: '#1e293b', color: '#fff' });
        } else if (action === 'COMPLETE') {
            Swal.fire({ icon: 'success', title: 'Félicitations !', text: 'Paiement en cours de validation.', timer: 2000, showConfirmButton: false, background: '#1e293b', color: '#fff' });
        }

        fetchDashboard(); // Rafraîchir la liste

    } catch (error: any) {
        toast.error(error.response?.data?.error || "Action impossible.");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-slate-400 font-medium animate-pulse">Chargement Espace Pro...</p>
    </div>
  );

  if (!data) return null; // Ou composant d'erreur

  const { user, stats, missions } = data;

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-200 font-sans">
      
      {/* --- SIDEBAR ARTISAN --- */}
      <aside className="w-64 border-r border-slate-800 p-6 hidden lg:flex flex-col fixed h-full bg-[#0B1120] z-10">
        <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center font-black text-white">P</div>
            <span className="text-xl font-bold text-white tracking-tight">IMMO<span className="text-orange-500">.PRO</span></span>
        </div>
        
        <nav className="space-y-2 flex-1">
            <Link href="/dashboard/artisan" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-900/20 font-medium">
                <LayoutDashboard className="w-5 h-5" /> Mes Chantiers
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition font-medium">
                <Wrench className="w-5 h-5" /> Compétences
            </Link>
        </nav>

        <button 
            onClick={() => { localStorage.removeItem("immouser"); router.push('/login'); }} 
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-white hover:bg-red-500/10 rounded-xl transition font-bold text-sm"
        >
            <LogOut className="w-5 h-5" /> Déconnexion
        </button>
      </aside>

      {/* --- CONTENU PRINCIPAL --- */}
      <main className="flex-1 p-6 md:p-10 lg:ml-64 pb-20">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-black text-white">{user.name} 🛠️</h1>
                    {/* Switch Disponibilité */}
                    <button 
                        onClick={toggleAvailability} 
                        className={`px-3 py-1 rounded-full border flex items-center gap-2 transition-all ${user.isAvailable ? 'border-green-500 bg-green-500/10 hover:bg-green-500/20' : 'border-red-500 bg-red-500/10 hover:bg-red-500/20'}`}
                    >
                        <div className={`w-2 h-2 rounded-full ${user.isAvailable ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className={`text-xs font-bold ${user.isAvailable ? 'text-green-400' : 'text-red-400'}`}>
                            {user.isAvailable ? 'Disponible' : 'Indisponible'}
                        </span>
                    </button>
                </div>
                <p className="text-slate-400 text-sm">Artisan Certifié • Note: {stats.rating}/5 ⭐</p>
            </div>

            {/* Widget Gains */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-6 w-full md:w-auto">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Portefeuille</p>
                    <p className="text-3xl font-black text-orange-500">{user.walletBalance.toLocaleString()} F</p>
                </div>
                <Button size="icon" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-black transition">
                    <Download className="w-5 h-5" />
                </Button>
            </div>
        </header>

        {/* STATS RAPIDES */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
            <Card className="bg-slate-900 border-slate-800 text-white">
                <CardContent className="p-6">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Missions Totales</p>
                    <p className="text-2xl font-black">{stats.missionsCount}</p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-white">
                <CardContent className="p-6">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Satisfaction Client</p>
                    <p className="text-2xl font-black text-yellow-400">{stats.rating}/5</p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-white">
                <CardContent className="p-6">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Revenus ce mois</p>
                    <p className="text-2xl font-black text-green-500">{stats.monthlyEarnings.toLocaleString()} F</p>
                </CardContent>
            </Card>
        </div>

        {/* LISTE DES MISSIONS */}
        <h3 className="font-bold text-xl text-white mb-6 flex items-center gap-2">
            <Hammer className="text-orange-500" /> Missions en cours
        </h3>
        
        <div className="space-y-4">
            {missions.length > 0 ? missions.map(m => (
                <Card key={m.id} className="bg-slate-900 border-slate-800 text-white hover:border-slate-700 transition group">
                    <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${m.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-800 text-slate-400'}`}>
                                <Hammer />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <h4 className="font-bold text-lg">{m.title}</h4>
                                    <Badge variant="outline" className={m.status === 'IN_PROGRESS' ? 'text-blue-400 border-blue-400 bg-blue-400/10' : 'text-slate-400 border-slate-600'}>
                                        {m.status === 'IN_PROGRESS' ? 'En Cours' : 'Nouvelle Demande'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                                    <MapPin className="w-3 h-3" /> {m.address}
                                </p>
                                <p className="text-sm text-slate-500 italic">"{m.description}"</p>
                                
                                {/* Info Client (Visible uniquement si mission acceptée) */}
                                {m.status === 'IN_PROGRESS' && m.clientName && (
                                    <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 inline-block animate-in fade-in">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Contact Client</p>
                                        <p className="font-mono text-sm text-white flex items-center gap-2">
                                            {m.clientName} 
                                            {m.clientPhone && (
                                                <>
                                                    • <a href={`tel:${m.clientPhone}`} className="text-orange-400 hover:text-orange-300 font-bold hover:underline">{m.clientPhone}</a>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-right w-full md:w-auto mt-4 md:mt-0">
                            <p className="text-xl font-mono font-bold text-orange-400 mb-3">
                                {m.amount > 0 ? m.amount.toLocaleString() + ' F' : 'Sur Devis'}
                            </p>
                            
                            {m.status === 'PENDING' ? (
                                <div className="flex gap-2 justify-end">
                                    <Button onClick={() => handleMissionAction(m.id, 'ACCEPT')} size="sm" className="bg-green-600 hover:bg-green-500 text-white font-bold shadow-lg shadow-green-900/20">
                                        <CheckCircle className="w-4 h-4 mr-2" /> Accepter
                                    </Button>
                                    <Button onClick={() => handleMissionAction(m.id, 'REJECT')} size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                        <XCircle className="w-4 h-4 mr-2" /> Refuser
                                    </Button>
                                </div>
                            ) : (
                                <Button onClick={() => handleMissionAction(m.id, 'COMPLETE')} size="sm" className="bg-blue-600 hover:bg-blue-500 w-full text-white font-bold shadow-lg shadow-blue-500/20">
                                    <CheckCircle className="w-4 h-4 mr-2" /> Terminer & Encaisser
                                </Button>
                            )}
                        </div>

                    </CardContent>
                </Card>
            )) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">Aucune mission pour le moment.</p>
                    <p className="text-slate-600 text-xs mt-1">Restez connecté, les demandes arrivent en temps réel.</p>
                </div>
            )}
        </div>

      </main>
    </div>
  );
}
