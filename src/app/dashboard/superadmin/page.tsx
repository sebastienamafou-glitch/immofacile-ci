"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, TrendingUp, ArrowLeft, Ghost, AlertTriangle, Activity } from "lucide-react";
import { api } from "@/lib/api";

import HeaderWarRoom from "@/components/dashboard/superadmin/HeaderWarRoom";
import KpiGrid from "@/components/dashboard/superadmin/KpiGrid";
import CreditGuichet from "@/components/dashboard/superadmin/CreditGuichet";
import GhostGenerator from "@/components/dashboard/superadmin/GhostGenerator";
import KycManager from "@/components/dashboard/superadmin/KycManager";
import MaintenanceAlerts from "@/components/dashboard/superadmin/MaintenanceAlerts";

import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGhostMode = searchParams.get('action') === 'ghost';

  const [loading, setLoading] = useState(!isGhostMode);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isGhostMode) return;

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
  }, [router, isGhostMode]);

  if (isGhostMode) {
      return (
        <div className="min-h-screen bg-[#020617] text-slate-200 p-6 md:p-12">
            <button onClick={() => router.push('/dashboard/superadmin')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-500 mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Quitter le mode rapide et voir le Dashboard
            </button>
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-500">
                        <Ghost className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white">Mode Aspirateur Actif</h1>
                        <p className="text-slate-400">Génération d'annonce optimisée (sans charger les statistiques).</p>
                    </div>
                </div>
                <GhostGenerator /> 
            </div>
        </div>
      );
  }

  if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-12 h-12"/></div>;
  if (!data) return null;

  // 📈 GRAPHIQUE 100% DYNAMIQUE
  const chartData = {
    labels: data.chart?.labels || ['J-6', 'J-5', 'J-4', 'J-3', 'J-2', 'Hier', 'Auj'],
    datasets: [{
        data: data.chart?.data || [0, 0, 0, 0, 0, 0, 0], 
        borderColor: '#F59E0B', 
        backgroundColor: (context: any) => {
            const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, "rgba(245, 158, 11, 0.4)");
            gradient.addColorStop(1, "rgba(245, 158, 11, 0)");
            return gradient;
        },
        fill: true, tension: 0.4
    }]
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-24 selection:bg-orange-500/30">
      <HeaderWarRoom />
      <main className="max-w-[1800px] mx-auto p-6 space-y-8">
        
        {/* 🚨 BANDEAU D'ALERTE : Échecs de paiement (Health Check) */}
        {(data.stats?.revenue?.failedTransactions > 0) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="text-red-500 w-6 h-6" />
                    <div>
                        <h4 className="text-red-400 font-bold text-sm">Alerte d'Infrastructure de Paiement</h4>
                        <p className="text-red-500/80 text-xs mt-0.5"><strong className="text-white">{data.stats.revenue.failedTransactions} transactions</strong> ont échoué récemment. Vérifiez la passerelle CinetPay.</p>
                    </div>
                </div>
            </div>
        )}

        <KpiGrid stats={data.stats} />
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                <TrendingUp className="text-orange-500 w-6 h-6"/> Trésorerie & Commissions Nettes
                            </h2>
                            <p className="text-slate-500 text-xs mt-1 font-medium flex items-center gap-1">
                                <Activity className="w-3 h-3"/> Temps réel sur les 7 derniers jours
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Volume Brut (GMV)</p>
                            <p className="text-2xl font-mono text-white font-bold">{data.stats?.revenue?.grossVolume?.toLocaleString('fr-FR')} <span className="text-sm text-slate-500">FCFA</span></p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <Line data={chartData} options={{ maintainAspectRatio: false, scales: { x: { display: true, grid: { color: '#1e293b' } }, y: { display: false } }, plugins: { tooltip: { mode: 'index', intersect: false } } }} />
                    </div>
                </div>
                <CreditGuichet owners={data.lists?.owners || []} />
                <GhostGenerator />
            </div> 
            <div className="space-y-6">
                <MaintenanceAlerts incidents={data.lists?.criticalIncidents || []} />
                <KycManager kycList={data.lists?.pendingKycs || []} kycCount={data.stats?.ops?.kycCount || 0} onUpdate={setData} />
            </div>
        </div>
      </main>
    </div>
  );
}

export default function WarRoomDashboard() {
    return (
        <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-12 h-12"/></div>}>
            <DashboardContent />
        </Suspense>
    );
}
