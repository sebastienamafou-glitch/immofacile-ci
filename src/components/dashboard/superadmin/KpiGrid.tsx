import { Wallet, ShieldAlert, Hammer, Plane, LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  subtext?: string;
}

const KpiCard = ({ title, value, icon: Icon, colorClass, subtext }: KpiCardProps) => (
  <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 group relative overflow-hidden shadow-xl">
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500 ${colorClass.replace('text-', 'bg-')}`}></div>
    <div className="flex justify-between items-start z-10">
      <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 group-hover:scale-110 transition-transform ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    <div className="mt-4 z-10">
      <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
      {subtext && <p className="text-xs text-slate-500 mt-1 font-mono">{subtext}</p>}
    </div>
  </div>
);

// ✅ TYPAGE STRICT : Aligné avec la nouvelle macro-économie de la route API
interface DashboardStats {
  revenue: { 
      total: number; 
      shortTerm: number;
      longTerm: number;
      grossVolume: number;
      failedTransactions: number;
  };
  ops: { incidentsCount: number; kycCount: number };
  hr: { users: number; agencies: number; artisansReady: number };
  assets: { total: number; activeBookings: number };
}

export default function KpiGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
        <KpiCard 
            title="Trésorerie Nette" 
            value={`${stats.revenue.total.toLocaleString('fr-FR')} F`} 
            subtext={`Classique: ${stats.revenue.longTerm.toLocaleString('fr-FR')} F | Akwaba: ${stats.revenue.shortTerm.toLocaleString('fr-FR')} F`} 
            icon={Wallet} 
            colorClass="text-emerald-500" 
        />
        <KpiCard 
            title="Incidents Critiques" 
            value={stats.ops.incidentsCount} 
            subtext="Intervention requise" 
            icon={ShieldAlert} 
            colorClass="text-red-500" 
        />
        <KpiCard 
            title="Artisans Disponibles" 
            value={stats.hr.artisansReady} 
            subtext="Disponibles sur le réseau" 
            icon={Hammer} 
            colorClass="text-blue-500" 
        />
        <KpiCard 
            title="Akwaba Live" 
            value={stats.assets.activeBookings} 
            subtext="Voyageurs en cours de séjour" 
            icon={Plane} 
            colorClass="text-purple-500" 
        />
    </div>
  );
}
