"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api"; // Axios gère les cookies automatiquement
import { toast } from "sonner";
import { 
  MapPin, Calendar, Clock, ArrowRight, CheckCircle, 
  Briefcase, Navigation, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    images: string[];
  };
}

export default function AgentVisitsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available"); 
  
  const [availableMissions, setAvailableMissions] = useState<Mission[]>([]);
  const [myMissions, setMyMissions] = useState<Mission[]>([]);
  const [historyMissions, setHistoryMissions] = useState<Mission[]>([]);

  // --- CHARGEMENT SYNCHRONISÉ ---
  const fetchMissions = async () => {
    try {
      setLoading(true);
      
      // ✅ APPEL CORRIGÉ : On tape sur la route unique qui agrège tout
      const res = await api.get('/agent/missions');
      
      if (res.data.success) {
        const { available, myMissions: allMy } = res.data.data;
        
        // 1. Marketplace
        setAvailableMissions(available || []);

        // 2. Mes Missions (Dispatch selon statut)
        if (Array.isArray(allMy)) {
            setMyMissions(allMy.filter((m: Mission) => m.status === 'ACCEPTED'));
            setHistoryMissions(allMy.filter((m: Mission) => m.status === 'COMPLETED'));
        }
      }

    } catch (error) {
      console.error("Erreur chargement missions", error);
      toast.error("Impossible de charger les visites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  // --- ACTIONS ---

  const handleAccept = async (missionId: string) => {
    try {
        // ✅ URL CORRIGÉE
        await api.post('/agent/missions/accept', { missionId });
        toast.success("Mission acceptée ! Ajoutée à votre agenda.");
        fetchMissions(); 
        setActiveTab("agenda"); 
    } catch (error: any) {
        toast.error(error.response?.data?.error || "Erreur lors de l'acceptation.");
    }
  };

  const handleComplete = async (missionId: string) => {
    // Note : Pour la V2, ajouter une modale avec upload de photo/rapport
    if(!confirm("Confirmer que la visite a été effectuée ?")) return;

    try {
        // ✅ URL CORRIGÉE
        await api.post('/agent/missions/complete', { missionId, reportData: { note: "Effectué via App" } });
        toast.success("Visite validée ! Commission créditée.");
        fetchMissions();
    } catch (error) {
        toast.error("Erreur lors de la validation.");
    }
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center bg-[#060B18]">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin"/>
    </div>
  );

  return (
    <div className="p-4 lg:p-10 max-w-7xl mx-auto min-h-screen bg-[#060B18] pb-20 font-sans">
      
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Gestion des Visites</h1>
            <p className="text-slate-400 mt-1">Gérez votre planning et acceptez de nouvelles missions.</p>
        </div>
        <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 flex items-center gap-3">
             <Briefcase className="w-5 h-5 text-emerald-500" />
             <span className="text-emerald-400 font-bold text-sm">Mode Agent Activé</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        
        {/* Navigation Onglets */}
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl w-full md:w-auto flex overflow-x-auto">
            <TabsTrigger value="available" className="flex-1 md:flex-none px-6 py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400 font-bold transition-all">
                📍 Nouvelles Missions 
                {availableMissions.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full animate-pulse">{availableMissions.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="agenda" className="flex-1 md:flex-none px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 font-bold transition-all">
                📅 Mon Planning
                {myMissions.length > 0 && <span className="ml-2 bg-slate-700 text-white text-[10px] px-1.5 rounded-full">{myMissions.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 md:flex-none px-6 py-2.5 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 font-bold transition-all">
                ✅ Historique
            </TabsTrigger>
        </TabsList>

        {/* --- 1. MARKETPLACE (UBER) --- */}
        <TabsContent value="available" className="animate-in slide-in-from-left-4 duration-500">
            {availableMissions.length === 0 ? (
                <EmptyState icon={MapPin} title="Aucune mission disponible" text="Il n'y a pas de demande de visite dans votre zone pour l'instant." />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableMissions.map((m) => (
                        <MissionCard key={m.id} mission={m} type="MARKET" onAction={() => handleAccept(m.id)} />
                    ))}
                </div>
            )}
        </TabsContent>

        {/* --- 2. AGENDA --- */}
        <TabsContent value="agenda" className="animate-in slide-in-from-right-4 duration-500">
             {myMissions.length === 0 ? (
                <EmptyState icon={Calendar} title="Agenda vide" text="Vous n'avez aucune visite planifiée. Allez dans 'Nouvelles Missions' pour en trouver !" />
            ) : (
                <div className="space-y-4">
                    {myMissions.map((m) => (
                        <MissionRow key={m.id} mission={m} onComplete={() => handleComplete(m.id)} />
                    ))}
                </div>
            )}
        </TabsContent>

        {/* --- 3. HISTORIQUE --- */}
        <TabsContent value="history">
            {historyMissions.length === 0 ? (
                <EmptyState icon={CheckCircle} title="Aucun historique" text="Vos missions terminées apparaîtront ici." />
            ) : (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                    {historyMissions.map((m) => (
                        <div key={m.id} className="p-4 border-b border-slate-800 last:border-0 flex items-center justify-between hover:bg-slate-800/50 transition">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <CheckCircle className="w-5 h-5"/>
                                </div>
                                <div>
                                    <p className="font-bold text-white">{m.property.title}</p>
                                    <p className="text-xs text-slate-500">{new Date(m.dateScheduled).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="border-emerald-500 text-emerald-500 bg-emerald-500/10">
                                +{m.fee} F (Payé)
                            </Badge>
                        </div>
                    ))}
                </div>
            )}
        </TabsContent>

      </Tabs>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function MissionCard({ mission, type, onAction }: { mission: Mission, type: string, onAction: () => void }) {
    return (
        <Card className="bg-slate-900 border-slate-800 text-white overflow-hidden hover:border-emerald-500/50 transition-all group flex flex-col shadow-lg">
            <div className="h-40 bg-slate-800 relative">
                {mission.property.images?.[0] ? (
                    <img src={mission.property.images[0]} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500" />
                ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                        <MapPin className="w-8 h-8 opacity-20"/>
                    </div>
                )}
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10">
                    <span className="text-emerald-400 font-bold text-sm">+{mission.fee.toLocaleString()} F</span>
                </div>
                <div className="absolute bottom-3 left-3">
                     <Badge className="bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors border-0">{mission.type}</Badge>
                </div>
            </div>
            <CardContent className="p-5 flex-1 flex flex-col">
                <h4 className="font-bold text-lg mb-1 truncate text-white">{mission.property.title}</h4>
                <p className="text-slate-400 text-sm flex items-center gap-1 mb-4 truncate">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0"/> {mission.property.address}, {mission.commune}
                </p>
                
                <div className="mt-auto pt-4 border-t border-slate-800">
                    <div className="flex justify-between items-center text-xs text-slate-400 mb-4">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(mission.dateScheduled).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(mission.dateScheduled).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <Button onClick={onAction} className="w-full bg-white text-black hover:bg-emerald-500 hover:text-white font-bold transition-all">
                        ACCEPTER LA COURSE <ArrowRight className="w-4 h-4 ml-2"/>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

function MissionRow({ mission, onComplete }: { mission: Mission, onComplete: () => void }) {
    return (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg hover:border-blue-500/30 transition-all">
            <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="hidden md:flex w-16 h-16 bg-blue-900/20 text-blue-400 rounded-xl items-center justify-center border border-blue-500/20 shrink-0">
                    <Navigation className="w-8 h-8"/>
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="border-blue-500 text-blue-400 text-[10px]">{mission.type}</Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3"/> {new Date(mission.dateScheduled).toLocaleString()}
                        </span>
                    </div>
                    <h4 className="font-bold text-white text-lg">{mission.property.title}</h4>
                    <p className="text-slate-400 text-sm">{mission.property.address}</p>
                </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                 <div className="text-right hidden md:block">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Commission</p>
                    <p className="text-emerald-400 font-bold text-lg">{mission.fee} F</p>
                 </div>
                 <Button onClick={onComplete} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-6 shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                    <CheckCircle className="w-4 h-4 mr-2"/> TERMINER
                 </Button>
            </div>
        </div>
    )
}

function EmptyState({ icon: Icon, title, text }: any) {
    return (
        <div className="text-center py-20 bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl">
            <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                <Icon className="w-8 h-8 opacity-50"/>
            </div>
            <p className="text-slate-300 font-bold text-lg">{title}</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">{text}</p>
        </div>
    )
}
