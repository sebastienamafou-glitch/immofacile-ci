"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api"; // Axios gère les cookies automatiquement
import { toast } from "sonner";
import { 
  Users, Wallet, Clock, 
  Plus, Loader2, X, MapPin, Calendar, 
  Briefcase, ArrowRight, Check
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// --- TYPES ---
interface Lead {
  id: string;
  name: string;
  phone: string;
  address: string;
  status: string;
  createdAt: string;
}

interface Mission {
  id: string;
  type: string;
  fee: number;
  commune: string;
  dateScheduled: string;
  status: string;
  property: {
    title: string;
    address: string;
    type: string;
    images: string[];
  };
}

export default function AgentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Onglets : 'market' (Missions Dispo), 'agenda' (Mes Missions), 'leads' (Mes Prospects)
  const [activeTab, setActiveTab] = useState<'market' | 'agenda' | 'leads'>('market');

  // Données
  const [stats, setStats] = useState({ totalLeads: 0, commissionEstimate: 0, managedCount: 0 });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [availableMissions, setAvailableMissions] = useState<Mission[]>([]);
  const [myMissions, setMyMissions] = useState<Mission[]>([]);

  // Modale & Forms
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", phone: "", address: "", photo: null as File | null });

  // --- CHARGEMENT DES DONNÉES ---
  const fetchAllData = async () => {
    try {
        setLoading(true);
        // ❌ PAS DE HEADERS MANUELS ICI. Le cookie fait le travail.
        
        // 1. Stats & Leads
        const dashboardRes = await api.get('/agent/dashboard');
        if (dashboardRes.data.success) {
            setStats(dashboardRes.data.stats);
            setLeads(dashboardRes.data.recentLeads || []);
        }

        // 2. Missions Disponibles (Uber Market)
        // Note: Assurez-vous que cette route existe bien dans /api/agent/missions
        const marketRes = await api.get('/agent/missions'); 
        if (marketRes.data.success) {
            setAvailableMissions(marketRes.data.data.available);
            setMyMissions(marketRes.data.data.myMissions);
        }

    } catch (error: any) {
        console.error("Erreur Sync:", error);
        if (error.response?.status === 401) {
             toast.error("Session expirée.");
             router.push('/login');
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --- ACTIONS ---

  const handleAcceptMission = async (missionId: string) => {
    try {
        // On envoie juste l'ID, le serveur sait qui nous sommes grâce au Cookie
        await api.post('/agent/missions/accept', { missionId });
        
        toast.success("Mission acceptée ! Elle est dans votre agenda.");
        fetchAllData(); 
        setActiveTab('agenda'); 
    } catch (error: any) {
        toast.error(error.response?.data?.error || "Impossible d'accepter cette mission.");
    }
  };

  const handleCompleteMission = async (missionId: string) => {
      try {
        await api.post('/agent/missions/complete', { 
            missionId, 
            reportData: { note: "Mission effectuée via App" } 
        });
        toast.success("Mission terminée ! Commission créditée.");
        fetchAllData();
      } catch (error) {
        toast.error("Erreur lors de la clôture.");
      }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
        const formData = new FormData();
        formData.append('name', newLead.name);
        formData.append('phone', newLead.phone);
        formData.append('address', newLead.address);
        if (newLead.photo) formData.append('leadPhoto', newLead.photo);

        // Axios gère le Content-Type multipart automatiquement quand on envoie du FormData
        await api.post('/agent/leads', formData);
        
        toast.success("Prospect ajouté !");
        setIsLeadModalOpen(false);
        setNewLead({ name: "", phone: "", address: "", photo: null });
        fetchAllData();
    } catch (error) {
        toast.error("Erreur ajout prospect.");
    } finally {
        setCreating(false);
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center text-white gap-4 bg-[#0B1120]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500"/>
        <p className="text-slate-400 text-sm">Chargement de votre espace...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#060B18] text-slate-200 font-sans">
      
      <main className="flex-1 p-4 md:p-8 relative w-full max-w-6xl mx-auto pb-20">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">ESPACE AGENT <span className="text-emerald-500">PRO</span></h1>
                <p className="text-slate-400 mt-1">Gérez vos missions et encaissez vos gains.</p>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 p-4 rounded-2xl border border-emerald-500/20 flex items-center gap-4 w-full md:w-auto shadow-2xl shadow-emerald-900/10">
                <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/20">
                    <Wallet className="text-emerald-400 w-6 h-6" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Solde Disponible</p>
                    <p className="text-2xl font-black text-white">{stats.commissionEstimate?.toLocaleString() || 0} F</p>
                </div>
            </div>
        </header>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap p-1 bg-slate-900/50 border border-slate-800 rounded-xl mb-8 w-full md:w-fit backdrop-blur-sm gap-2 md:gap-0">
            <button 
                onClick={() => setActiveTab('market')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'market' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <MapPin className="w-4 h-4"/> Missions Dispo
                {availableMissions.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse">{availableMissions.length}</span>}
            </button>
            <button 
                onClick={() => setActiveTab('agenda')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'agenda' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Calendar className="w-4 h-4"/> Mon Agenda
            </button>
            <button 
                onClick={() => setActiveTab('leads')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'leads' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Users className="w-4 h-4"/> Prospects
            </button>
        </div>

        {/* CONTENU */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* ONGLET 1: MARKETPLACE */}
            {activeTab === 'market' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">📍 Missions disponibles</h3>
                    </div>
                    {availableMissions.length === 0 ? (
                        <div className="text-center py-16 bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl">
                            <MapPin className="w-8 h-8 opacity-50 mx-auto mb-4 text-slate-500"/>
                            <p className="text-slate-400">Aucune mission dans votre secteur pour le moment.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableMissions.map((mission) => (
                                <Card key={mission.id} className="bg-slate-900 border-slate-800 text-white overflow-hidden hover:border-emerald-500/50 transition-all">
                                    <div className="h-32 bg-slate-800 relative">
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10"/>
                                        <div className="absolute bottom-3 left-4 z-20">
                                            <Badge className="bg-emerald-500 text-black font-bold border-0">{mission.type}</Badge>
                                        </div>
                                        <div className="absolute top-3 right-3 z-20 bg-black/60 px-3 py-1 rounded-full border border-white/10">
                                            <span className="text-emerald-400 font-bold text-sm">+{mission.fee.toLocaleString()} F</span>
                                        </div>
                                    </div>
                                    <CardContent className="p-5">
                                        <h4 className="font-bold text-lg mb-1 truncate">{mission.property?.title || 'Bien Immobilier'}</h4>
                                        <p className="text-slate-400 text-sm mb-4">{mission.property?.address}</p>
                                        <p className="text-xs text-slate-500 mb-6 flex items-center gap-2">
                                            <Calendar className="w-3 h-3"/> {new Date(mission.dateScheduled).toLocaleString()}
                                        </p>
                                        <Button onClick={() => handleAcceptMission(mission.id)} className="w-full bg-white text-black hover:bg-emerald-500 font-bold">
                                            ACCEPTER <ArrowRight className="w-4 h-4 ml-2"/>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ONGLET 2: AGENDA */}
            {activeTab === 'agenda' && (
                <>
                    <h3 className="text-xl font-bold text-white mb-6">📅 Mes Missions</h3>
                    {myMissions.length === 0 ? (
                        <p className="text-slate-500 italic">Agenda vide.</p>
                    ) : (
                        <div className="space-y-4">
                            {myMissions.map(mission => (
                                <div key={mission.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/20">
                                            <Briefcase className="w-5 h-5"/>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-lg">{mission.type}</h4>
                                            <p className="text-slate-400 text-sm">
                                                {new Date(mission.dateScheduled).toLocaleString()} • <span className="text-emerald-400 font-bold">{mission.fee} F</span>
                                            </p>
                                        </div>
                                    </div>
                                    {mission.status === 'COMPLETED' ? (
                                        <Badge variant="outline" className="text-green-500 border-green-500">Payée</Badge>
                                    ) : (
                                        <Button onClick={() => handleCompleteMission(mission.id)} className="bg-blue-600 hover:bg-blue-700 font-bold">
                                            <Check className="w-4 h-4 mr-2"/> Valider
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ONGLET 3: PROSPECTS */}
            {activeTab === 'leads' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">👥 Mes Prospects</h3>
                        <Button onClick={() => setIsLeadModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 font-bold">
                            <Plus className="w-4 h-4 mr-2"/> Ajouter
                        </Button>
                    </div>
                    <div className="grid gap-4">
                        {leads.map((lead) => (
                            <div key={lead.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                                    {lead.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">{lead.name}</h4>
                                    <p className="text-slate-400 text-sm">{lead.phone}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>

      </main>

      {/* MODALE */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Nouveau Prospect</h3>
                    <button onClick={() => setIsLeadModalOpen(false)}><X className="text-slate-400 hover:text-white"/></button>
                </div>
                <form onSubmit={handleCreateLead} className="space-y-4">
                    <Input placeholder="Nom" required className="bg-slate-900 border-slate-700 text-white" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
                    <Input placeholder="Téléphone" required className="bg-slate-900 border-slate-700 text-white" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} />
                    <Input placeholder="Besoin / Adresse" className="bg-slate-900 border-slate-700 text-white" value={newLead.address} onChange={e => setNewLead({...newLead, address: e.target.value})} />
                    <Button type="submit" disabled={creating} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold">{creating ? <Loader2 className="animate-spin"/> : "Enregistrer"}</Button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}
