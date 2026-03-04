"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { Suspense } from "react";

// Import des futurs sous-composants (à créer à l'étape suivante)
import HeaderWarRoom from "@/components/dashboard/superadmin/HeaderWarRoom";
import KpiGrid from "@/components/dashboard/superadmin/KpiGrid";
import CreditGuichet from "@/components/dashboard/superadmin/CreditGuichet";
import GhostGenerator from "@/components/dashboard/superadmin/GhostGenerator";
import KycManager from "@/components/dashboard/superadmin/KycManager";
import MaintenanceAlerts from "@/components/dashboard/superadmin/MaintenanceAlerts";

// (Optionnel) Composant ChartJS simplifié gardé ici pour l'instant
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function WarRoomDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null); // Idéalement, créer une interface DashboardData

  // CHARGEMENT INITIAL GLOBAL
  useEffect(() => {
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
  }, [router]);

  if (loading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-12 h-12"/></div>;
  if (!data) return null;

  // Configuration du Graphique
  const chartData = {
    labels: ['J-5', 'J-4', 'J-3', 'J-2', 'Hier', 'Auj'],
    datasets: [{
        data: [12000, 19000, 3000, 5000, 20000, data.stats.revenue.shortTerm], 
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
        
        {/* LIGNE 1 : KPI STRATÉGIQUES */}
        <KpiGrid stats={data.stats} />

        {/* LIGNE 2 : OPÉRATIONS & FLUX */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE (LARGE) */}
            <div className="xl:col-span-2 space-y-8">
                
                {/* GRAPHIQUE */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-white flex items-center gap-2"><TrendingUp className="text-orange-500 w-6 h-6"/> Flux Financier Temps Réel</h2>
                    </div>
                    <div className="h-[300px] w-full">
                        <Line data={chartData} options={{ maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false } } }} />
                    </div>
                </div>

                {/* MODULES AUTONOMES */}
                <CreditGuichet owners={data.lists.owners} />
                <Suspense fallback={<div className="p-8 text-center text-orange-500 bg-slate-900 rounded-3xl animate-pulse font-bold">Initialisation de l'Aspirateur...</div>}></Suspense>
                    <GhostGenerator />
                </Suspense>    


            {/* COLONNE DROITE (ACTION RAPIDE) */}
            <div className="space-y-6">
                <MaintenanceAlerts incidents={data.lists.criticalIncidents} />
                
                {/* On passe setData pour que KycManager puisse mettre à jour les compteurs globaux */}
                <KycManager 
                  kycList={data.lists.pendingKycs} 
                  kycCount={data.stats.ops.kycCount} 
                  onUpdate={setData} 
                />
            </div>
        </div>
      </main>
    </div>
  );
}
