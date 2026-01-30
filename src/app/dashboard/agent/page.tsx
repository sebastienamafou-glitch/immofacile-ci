"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api"; // ✅ Wrapper sécurisé
import { 
  Briefcase, MapPin, Calendar, TrendingUp, 
  Users, Wallet, Clock, ArrowRight, Loader2, CheckCircle2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- TYPES STRICTS ---
interface DashboardData {
    stats: {
        commissionEstimate: number;
        totalLeads: number;
        managedCount: number;
        walletBalance: number;
    };
    recentLeads: Array<{
        id: string;
        name: string;
        phone: string;
        status: string;
    }>;
}

interface MissionData {
    available: Array<{
        id: string;
        type: string;
        createdAt: string;
        fee: number;
        property: { title: string; address: string };
    }>;
    myMissions: Array<{
        id: string;
        type: string;
        dateScheduled: string | null;
        status: string;
        property: { address: string };
    }>;
}

export default function AgentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [missions, setMissions] = useState<MissionData | null>(null);

  // 1. CHARGEMENT DES DONNÉES (ZERO TRUST)
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // ✅ Appels parallèles sécurisés via le wrapper
        const [resStats, resMissions] = await Promise.all([
           api.get('/agent/dashboard'),
           api.get('/agent/missions')
        ]);

        if (resStats.data.success) setData(resStats.data);
        if (resMissions.data.success) setMissions(resMissions.data);

      } catch (e: any) {
        console.error(e);
        if (e.response?.status === 401) {
            router.push('/login');
        } else {
            toast.error("Impossible de charger le tableau de bord.");
        }
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [router]);

  // 2. ACTION : ACCEPTER UNE MISSION
  const handleAcceptMission = async (id: string) => {
      try {
        // ✅ POST Sécurisé
        await api.post(`/agent/missions/${id}/accept`, {});
        
        toast.success("Mission acceptée ! Au travail ! 💼");
        
        // Rafraîchissement optimiste ou complet
        window.location.reload(); 

      } catch (e: any) {
          toast.error(e.response?.data?.error || "Erreur lors de l'acceptation.");
      }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500"/>
        <p className="text-sm font-mono text-slate-500">Synchronisation Agence...</p>
    </div>
  );

  return (
    <div className="p-6 md:p-10 font-sans text-slate-200 min-h-screen pb-24 bg-[#0B1120]">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
                <h1 className="text-3xl font-black text-white mb-1 uppercase tracking-tight">Espace Agent</h1>
                <p className="text-slate-400 text-sm">Gérez vos missions et développez votre réseau.</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                    <Wallet className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500">Solde & Commissions</p>
                    <p className="text-2xl font-black text-white tracking-tight">
                        {data?.stats?.commissionEstimate?.toLocaleString() || 0} <span className="text-blue-500 text-sm">FCFA</span>
                    </p>
                </div>
            </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className="bg-slate-900 border-slate-800 shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition rounded-2xl">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition"><Users className="w-24 h-24 text-white"/></div>
                <CardContent className="p-6">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Prospects Actifs</p>
                    <p className="text-4xl font-black text-white">{data?.stats?.totalLeads || 0}</p>
                </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition rounded-2xl">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition"><Briefcase className="w-24 h-24 text-white"/></div>
                <CardContent className="p-6">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Missions Réalisées</p>
                    <p className="text-4xl font-black text-blue-400">{data?.stats?.managedCount || 0}</p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-none shadow-xl text-white rounded-2xl">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                    <div>
                        <p className="text-blue-200 text-xs font-bold uppercase mb-1">Performance</p>
                        <p className="text-4xl font-black tracking-tight">Excellent</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm font-bold bg-black/20 w-fit px-3 py-1 rounded-full border border-white/10">
                        <TrendingUp className="w-4 h-4" /> Top 10% Agence
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE : LE MARCHÉ DES MISSIONS */}
            <div className="xl:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-orange-500" /> Opportunités (Marketplace)
                    </h2>
                    <Badge variant="outline" className="text-orange-500 border-orange-500/30 bg-orange-500/10">
                        {missions?.available?.length || 0} dispo
                    </Badge>
                </div>

                <div className="grid gap-4">
                    {(!missions?.available || missions.available.length === 0) ? (
                        <div className="p-12 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30 text-center flex flex-col items-center justify-center gap-3">
                            <CheckCircle2 className="w-10 h-10 text-slate-700" />
                            <p className="text-slate-500 font-medium">Aucune mission disponible pour le moment.</p>
                        </div>
                    ) : (
                        missions.available.map((m) => (
                            <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-orange-500/50 transition-all group relative overflow-hidden shadow-lg">
                                <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <Badge className="bg-blue-600 hover:bg-blue-500 border-none px-3 py-1">
                                                {m.type.replace(/_/g, ' ')}
                                            </Badge>
                                            <span className="text-slate-500 text-xs font-mono flex items-center gap-1 font-bold">
                                                <Clock className="w-3 h-3"/> {new Date(m.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3 className="font-black text-xl text-white mb-2">{m.property?.title || "Propriété Confidentielle"}</h3>
                                        <p className="text-slate-400 text-sm flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-orange-500"/> {m.property?.address || "Adresse masquée"}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end justify-center gap-3 min-w-[140px] pl-4 md:border-l border-slate-800">
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Commission</p>
                                            <p className="text-2xl font-black text-emerald-400">{m.fee.toLocaleString()} F</p>
                                        </div>
                                        <Button 
                                            onClick={() => handleAcceptMission(m.id)}
                                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold h-10 rounded-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-transform"
                                        >
                                            ACCEPTER
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* COLONNE DROITE : AGENDA & PROSPECTS */}
            <div className="space-y-8">
                
                {/* AGENDA */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <h3 className="font-bold text-white mb-6 flex items-center gap-2 text-lg">
                        <Calendar className="w-5 h-5 text-blue-500" /> Mon Planning
                    </h3>
                    <div className="space-y-4">
                        {(!missions?.myMissions || missions.myMissions.length === 0) ? (
                            <p className="text-sm text-slate-500 italic text-center py-4">Agenda vide. Acceptez une mission !</p>
                        ) : (
                            missions.myMissions.map((m) => (
                                <div key={m.id} className="flex gap-4 items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                    <div className="flex flex-col items-center justify-center min-w-[50px] bg-slate-800 rounded-lg h-12 w-12 border border-slate-700">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                            {m.dateScheduled ? new Date(m.dateScheduled).toLocaleDateString('fr-FR', {month:'short'}) : '-'}
                                        </span>
                                        <span className="text-lg font-black text-white leading-none">
                                            {m.dateScheduled ? new Date(m.dateScheduled).getDate() : '?'}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{m.type.replace(/_/g, ' ')}</p>
                                        <p className="text-xs text-slate-500 truncate mb-1">{m.property?.address}</p>
                                        <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {m.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* DERNIERS LEADS */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                            <Users className="w-5 h-5 text-emerald-500" /> Leads Récents
                        </h3>
                        <Link href="/dashboard/agent/leads">
                            <Button variant="ghost" size="sm" className="text-xs h-7 text-slate-400 hover:text-white">Voir tout</Button>
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {(!data?.recentLeads || data.recentLeads.length === 0) ? (
                            <p className="text-sm text-slate-500 italic text-center">Aucun prospect assigné.</p>
                        ) : (
                            data.recentLeads.map((l) => (
                                <div key={l.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 border border-slate-700 group-hover:bg-slate-700 group-hover:text-white transition">
                                            {l.name ? l.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{l.name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">{l.phone}</p>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${l.status === 'NEW' ? 'bg-orange-500' : 'bg-slate-700'}`}></div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}
