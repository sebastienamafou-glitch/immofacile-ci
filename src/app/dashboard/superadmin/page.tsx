"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, TrendingUp, ArrowLeft, Ghost } from "lucide-react";
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

// 1. LE COMPOSANT INTELLIGENT
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ DÉTECTION DU SCRIPT ASPIRATEUR
  const isGhostMode = searchParams.get('action') === 'ghost';

  const [loading, setLoading] = useState(!isGhostMode); // Pas de chargement si mode Ghost
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // ✅ SI ON EST EN MODE GHOST, ON ANNULE LA LOURDE REQUÊTE DB
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

  // ==========================================
  // RENDU 1 : MODE ASPIRATEUR ULTRA-RAPIDE
  // ==========================================
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
                {/* On n'affiche QUE ce composant */}
                <GhostGenerator /> 
            </div>
        </div>
      );
  }

  // ==========================================
  // RENDU 2 : DASHBOARD SUPERADMIN COMPLET
  // ==========================================
  if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-12 h-12"/></div>;
  if (!data) return null;

  const chartData = {
    labels: ['J-5', 'J-4', 'J-3', 'J-2', 'Hier', 'Auj'],
    datasets: [{
        data: [12000, 19000, 3000, 5000, 20000, data.stats?.revenue?.shortTerm || 0], 
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
        <KpiGrid stats={data.stats} />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-white flex items-center gap-2"><TrendingUp className="text-orange-500 w-6 h-6"/> Flux Financier Temps Réel</h2>
                    </div>
                    <div className="h-[300px] w-full">
                        <Line data={chartData} options={{ maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false } } }} />
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

// 2. LE WRAPPER SUSPENSE OBLIGATOIRE POUR NEXT.JS
export default function WarRoomDashboard() {
    return (
        <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-12 h-12"/></div>}>
            <DashboardContent />
        </Suspense>
    );
}
