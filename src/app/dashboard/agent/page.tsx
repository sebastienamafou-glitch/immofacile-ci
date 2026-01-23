"use client";

import { useState, useEffect } from "react";
import { 
  Briefcase, MapPin, Calendar, TrendingUp, 
  Users, Wallet, Clock, ArrowRight, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

export default function AgentDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null); // Stats + Leads
  const [missions, setMissions] = useState<any>(null); // Missions Market + My Missions

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const stored = localStorage.getItem("immouser");
        const userEmail = stored ? JSON.parse(stored).email : "";

        // On charge les stats ET les missions en parallèle
        // Note: On utilise fetch standard ici pour éviter les dépendances externes inconnues
        const headers = { 'x-user-email': userEmail };
        
        const [resStats, resMissions] = await Promise.all([
           fetch('/api/agent/dashboard', { headers }),
           fetch('/api/agent/missions', { headers })
        ]);

        const statsJson = await resStats.json();
        const missionsJson = await resMissions.json();

        if (resStats.ok) setData(statsJson);
        if (resMissions.ok) setMissions(missionsJson);

      } catch (e) {
        console.error(e);
        toast.error("Erreur de chargement du tableau de bord");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const handleAcceptMission = async (id: string) => {
      try {
        const stored = localStorage.getItem("immouser");
        const userEmail = stored ? JSON.parse(stored).email : "";

        const res = await fetch(`/api/agent/missions/${id}/accept`, {
            method: 'POST',
            headers: { 'x-user-email': userEmail }
        });

        if (res.ok) {
            toast.success("Mission acceptée !");
            window.location.reload(); 
        } else {
            toast.error("Impossible d'accepter cette mission.");
        }
      } catch (e) {
          toast.error("Erreur serveur.");
      }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500"/>
        <p className="text-sm font-mono text-slate-500">Synchronisation des missions...</p>
    </div>
  );

  return (
    <div className="p-6 md:p-10 font-sans text-slate-200 min-h-screen pb-24">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
                <h1 className="text-2xl font-black text-white mb-1">Espace Agent</h1>
                <p className="text-slate-400 text-sm">Gérez vos missions et vos prospects.</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
                <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                    <Wallet className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500">Commissions Est.</p>
                    <p className="text-2xl font-black text-white">
                        {data?.stats?.commissionEstimate?.toLocaleString() || 0} F
                    </p>
                </div>
            </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className="bg-slate-900 border-slate-800 shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition"><Users className="w-24 h-24 text-white"/></div>
                <CardContent className="p-6">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Prospects (Leads)</p>
                    <p className="text-4xl font-black text-white">{data?.stats?.totalLeads || 0}</p>
                </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition"><Briefcase className="w-24 h-24 text-white"/></div>
                <CardContent className="p-6">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Missions Gérées</p>
                    <p className="text-4xl font-black text-blue-400">{data?.stats?.managedCount || 0}</p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-none shadow-lg text-white">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                    <div>
                        <p className="text-blue-200 text-xs font-bold uppercase mb-1">Performance</p>
                        <p className="text-4xl font-black">Top 5%</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium bg-black/20 w-fit px-3 py-1 rounded-full">
                        <TrendingUp className="w-4 h-4" /> Croissance stable
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE : LE MARCHÉ DES MISSIONS */}
            <div className="xl:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-orange-500" /> Missions Disponibles
                    </h2>
                    <Badge variant="outline" className="text-orange-500 border-orange-500 bg-orange-500/10">
                        {missions?.available?.length || 0} en attente
                    </Badge>
                </div>

                <div className="grid gap-4">
                    {(!missions?.available || missions.available.length === 0) ? (
                        <div className="p-10 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50 text-center">
                            <p className="text-slate-500">Aucune nouvelle mission sur le marché.</p>
                        </div>
                    ) : (
                        missions.available.map((m: any) => (
                            <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-orange-500/50 transition-all group relative overflow-hidden">
                                <div className="flex flex-col md:flex-row justify-between gap-4 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge className="bg-blue-600 hover:bg-blue-500 border-none">
                                                {m.type.replace('_', ' ')}
                                            </Badge>
                                            <span className="text-slate-500 text-xs font-mono flex items-center gap-1">
                                                <Clock className="w-3 h-3"/> {new Date(m.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg text-white mb-1">{m.property?.title || "Propriété"}</h3>
                                        <p className="text-slate-400 text-sm flex items-center gap-1">
                                            <MapPin className="w-3 h-3"/> {m.property?.address || "Adresse masquée"}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end justify-center gap-2 min-w-[140px]">
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-bold text-slate-500">Commission</p>
                                            <p className="text-xl font-black text-emerald-400">{m.fee.toLocaleString()} F</p>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleAcceptMission(m.id)}
                                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-lg shadow-orange-900/20"
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
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" /> Mon Agenda
                    </h3>
                    <div className="space-y-4">
                        {(!missions?.myMissions || missions.myMissions.length === 0) ? (
                            <p className="text-sm text-slate-500 italic">Agenda vide.</p>
                        ) : (
                            missions.myMissions.map((m: any) => (
                                <div key={m.id} className="flex gap-4 items-start border-l-2 border-blue-500 pl-4 py-1">
                                    <div className="flex flex-col items-center min-w-[50px]">
                                        <span className="text-xs font-bold text-slate-500 uppercase">
                                            {m.dateScheduled ? new Date(m.dateScheduled).toLocaleDateString('fr-FR', {month:'short'}) : '-'}
                                        </span>
                                        <span className="text-xl font-black text-white">
                                            {m.dateScheduled ? new Date(m.dateScheduled).getDate() : '?'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white line-clamp-1">{m.type.replace('_', ' ')}</p>
                                        <p className="text-xs text-slate-400 line-clamp-1">{m.property?.address}</p>
                                        <span className="inline-block mt-1 text-[10px] bg-blue-500/10 text-blue-400 px-2 rounded border border-blue-500/20">
                                            {m.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* DERNIERS LEADS */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-500" /> Récents Leads
                        </h3>
                        <Link href="/dashboard/agent/leads" className="text-xs text-slate-500 hover:text-white transition">Voir tout</Link>
                    </div>
                    <div className="space-y-3">
                        {(!data?.recentLeads || data.recentLeads.length === 0) ? (
                            <p className="text-sm text-slate-500 italic">Aucun prospect récent.</p>
                        ) : (
                            data.recentLeads.map((l: any) => (
                                <div key={l.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl hover:bg-black/40 transition cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                                            {l.name ? l.name.charAt(0) : '?'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">{l.name}</p>
                                            <p className="text-[10px] text-slate-500">{l.phone}</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-600" />
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
