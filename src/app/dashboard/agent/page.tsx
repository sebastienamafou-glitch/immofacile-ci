"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  Users, Wallet, CheckCircle, Clock, 
  Plus, Loader2, X, MapPin, Calendar, 
  Briefcase, ArrowRight, Check
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// --- TYPES STRICTS ---
interface Lead {
  id: string;
  name: string;
  phone: string;
  address: string;
  status: string;
  photo?: string;
  createdAt: string;
}

interface Mission {
  id: string;
  type: string; // VISITE, ETAT_LIEUX
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

// Fonction utilitaire sécurisée
const getAgentUser = () => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("immouser");
    if (!stored) return null;
    return JSON.parse(stored);
};

export default function AgentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Onglets : 'market' (Uber), 'agenda' (Missions), 'leads' (Prospects)
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

  // --- CHARGEMENT DES DONNÉES SÉCURISÉ ---
  const fetchAllData = async () => {
    const user = getAgentUser();
    if (!user) {
        router.push('/login');
        return;
    }

    try {
        setLoading(true);
        const headers = { 'x-user-email': user.email }; // Header obligatoire
        
        // 1. Stats & Leads
        const dashboardRes = await api.get('/agent/dashboard', { headers });
        if (dashboardRes.data.success) {
            setStats(dashboardRes.data.stats);
            setLeads(dashboardRes.data.leads);
        }

        // 2. Missions Disponibles (Uber Market)
        const marketRes = await api.get('/missions/available', { headers });
        if (marketRes.data.success) {
            setAvailableMissions(marketRes.data.missions);
        }

        // 3. Mes Missions (Agenda)
        const myMissionsRes = await api.get('/missions/my', { headers });
        if (myMissionsRes.data.success) {
            setMyMissions(myMissionsRes.data.missions);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // On laisse le tableau vide pour ne lancer qu'au montage

  // --- ACTIONS SÉCURISÉES ---

  // Accepter une mission (Le cœur du système Uber)
  const handleAcceptMission = async (missionId: string) => {
    const user = getAgentUser();
    if (!user) return;

    try {
        await api.post('/missions/accept', 
            { missionId }, 
            { headers: { 'x-user-email': user.email } }
        );
        toast.success("Mission acceptée ! Elle est dans votre agenda.");
        fetchAllData(); // Rafraîchir tout
        setActiveTab('agenda'); // Rediriger vers l'agenda
    } catch (error: any) {
        toast.error(error.response?.data?.error || "Impossible d'accepter cette mission.");
    }
  };

  // Terminer une mission
  const handleCompleteMission = async (missionId: string) => {
      const user = getAgentUser();
      if (!user) return;

      try {
        await api.post('/missions/complete', 
            { missionId, reportData: { note: "Effectué" } },
            { headers: { 'x-user-email': user.email } }
        );
        toast.success("Mission terminée ! Commission créditée.");
        fetchAllData();
      } catch (error) {
        toast.error("Erreur lors de la clôture.");
      }
  };

  // Créer un Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = getAgentUser();
    if (!user) return;

    setCreating(true);
    try {
        const formData = new FormData();
        formData.append('name', newLead.name);
        formData.append('phone', newLead.phone);
        formData.append('address', newLead.address);
        if (newLead.photo) formData.append('leadPhoto', newLead.photo);

        await api.post('/agent/leads', formData, { 
            headers: { 
                'Content-Type': 'multipart/form-data',
                'x-user-email': user.email 
            } 
        });
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

  if (loading && leads.length === 0) return (
    <div className="h-screen w-full flex flex-col items-center justify-center text-white gap-4 bg-[#0B1120]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500"/>
        <p className="text-slate-400 text-sm">Recherche de missions...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-200 font-sans">
      
      <main className="flex-1 p-4 md:p-8 relative w-full max-w-6xl mx-auto pb-20">
        
        {/* HEADER & WALLET */}
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
                    <p className="text-2xl font-black text-white">{stats.commissionEstimate.toLocaleString()} F</p>
                </div>
            </div>
        </header>

        {/* --- NAVIGATION TABS --- */}
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

        {/* =====================================================================================
            ONGLET 1: MARKETPLACE (UBER)
           ===================================================================================== */}
        {activeTab === 'market' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">📍 Missions autour de vous</h3>
                    <span className="text-xs text-slate-500">Zone : Abidjan (Cocody)</span>
                </div>

                {availableMissions.length === 0 ? (
                    <div className="text-center py-16 bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl">
                        <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                            <MapPin className="w-8 h-8 opacity-50"/>
                        </div>
                        <p className="text-slate-400 font-medium">Aucune mission disponible pour le moment.</p>
                        <p className="text-slate-600 text-sm mt-1">Revenez plus tard, ça part vite !</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableMissions.map((mission) => (
                            <Card key={mission.id} className="bg-slate-900 border-slate-800 text-white overflow-hidden hover:border-emerald-500/50 transition-all group">
                                <div className="h-32 bg-slate-800 relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10"/>
                                    <div className="absolute bottom-3 left-4 z-20">
                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold border-0">
                                            {mission.type}
                                        </Badge>
                                    </div>
                                    <div className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10">
                                        <span className="text-emerald-400 font-bold text-sm">+{mission.fee.toLocaleString()} F</span>
                                    </div>
                                </div>
                                <CardContent className="p-5">
                                    <h4 className="font-bold text-lg mb-1 truncate">{mission.property.title}</h4>
                                    <p className="text-slate-400 text-sm flex items-center gap-1 mb-4">
                                        <MapPin className="w-3 h-3 text-slate-500"/> {mission.property.address}
                                    </p>
                                    
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-6 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(mission.dateScheduled).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(mission.dateScheduled).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>

                                    <Button 
                                        onClick={() => handleAcceptMission(mission.id)}
                                        className="w-full bg-white text-black hover:bg-emerald-500 hover:text-black font-bold transition-all shadow-lg shadow-white/5 hover:shadow-emerald-500/20"
                                    >
                                        ACCEPTER LA COURSE <ArrowRight className="w-4 h-4 ml-2"/>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* =====================================================================================
            ONGLET 2: MON AGENDA
           ===================================================================================== */}
        {activeTab === 'agenda' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-xl font-bold text-white mb-6">📅 Vos Missions Acceptées</h3>
                
                {myMissions.length === 0 ? (
                    <p className="text-slate-500 italic">Vous n'avez aucune mission prévue.</p>
                ) : (
                    <div className="space-y-4">
                        {myMissions.map(mission => (
                             <div key={mission.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/20">
                                        <Briefcase className="w-5 h-5"/>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{mission.type} - {mission.property.title}</h4>
                                        <p className="text-slate-400 text-sm flex items-center gap-2">
                                            {new Date(mission.dateScheduled).toLocaleString()} • <span className="text-emerald-400 font-bold">Gain: {mission.fee} F</span>
                                        </p>
                                    </div>
                                </div>

                                {mission.status === 'COMPLETED' ? (
                                    <Badge variant="outline" className="text-green-500 border-green-500 px-4 py-1">Terminée & Payée</Badge>
                                ) : (
                                    <Button 
                                        onClick={() => handleCompleteMission(mission.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
                                    >
                                        <Check className="w-4 h-4 mr-2"/> Valider & Encaisser
                                    </Button>
                                )}
                             </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* =====================================================================================
            ONGLET 3: PROSPECTS (CRM)
           ===================================================================================== */}
        {activeTab === 'leads' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">👥 Mes Prospects Personnels</h3>
                    <Button onClick={() => setIsLeadModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
                        <Plus className="w-4 h-4 mr-2"/> Ajouter Prospect
                    </Button>
                </div>

                <div className="grid gap-4">
                    {leads.map((lead) => (
                        <div key={lead.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-orange-500/30 transition">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500 border border-slate-700">
                                    {lead.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">{lead.name}</h4>
                                    <p className="text-slate-400 text-sm">{lead.phone}</p>
                                    {lead.address && <p className="text-slate-500 text-xs mt-1">📍 {lead.address}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {leads.length === 0 && <p className="text-slate-500 text-center py-10">Aucun prospect enregistré.</p>}
                </div>
             </div>
        )}

      </main>

      {/* --- MODALE AJOUT PROSPECT --- */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
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
