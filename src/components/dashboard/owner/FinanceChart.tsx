"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface DashboardStats {
  totalRent: number; // Modifié pour correspondre exactement à StatsOverview
  totalExpenses: number; // Harmonisation des noms (totalExpenses vs totalExpensesMonth)
  netIncomeYTD: number;  // Harmonisation
  [key: string]: any;
}

export default function FinanceChart({ stats }: { stats: DashboardStats }) {
  
  // Mapping sécurisé des props reçues depuis StatsOverview
  const data = [
    { name: 'Revenus', amount: stats?.totalRent || 0, colorStart: '#4ade80', colorEnd: '#22c55e' },
    { name: 'Dépenses', amount: stats?.totalExpenses || 0, colorStart: '#f87171', colorEnd: '#ef4444' }, // Modifié pour matcher la prop
    { name: 'Résultat', amount: stats?.netIncomeYTD || 0, colorStart: '#60a5fa', colorEnd: '#3b82f6' }, // Modifié pour matcher la prop
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0B1120]/95 border border-slate-700 backdrop-blur-xl p-4 rounded-xl shadow-2xl z-50">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
          <p className="text-xl font-black text-white">
            {payload[0].value.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">FCFA</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#131b2e] border border-slate-800/60 p-6 rounded-[2rem] h-full flex flex-col relative overflow-hidden group min-h-[350px]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

        <div className="flex justify-between items-center mb-6 relative z-10">
            <div>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    📊 Trésorerie
                </h3>
                <p className="text-slate-500 text-xs">Entrées vs Sorties ce mois-ci</p>
            </div>
            <select className="bg-slate-800/50 text-xs font-bold text-slate-300 border border-slate-700 rounded-lg py-1.5 px-3 outline-none hover:bg-slate-800 transition cursor-pointer">
                <option>Ce mois</option>
                <option>Cette année</option>
            </select>
        </div>
        
        <div className="flex-1 w-full min-h-[200px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barSize={45}> 
                    <defs>
                        {data.map((entry, index) => (
                            <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={entry.colorStart} stopOpacity={1}/>
                                <stop offset="100%" stopColor={entry.colorEnd} stopOpacity={0.6}/>
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} 
                        dy={15}
                    />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }} />
                    <Bar dataKey="amount" radius={[12, 12, 12, 12]} animationDuration={1500}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`url(#gradient-${index})`} strokeWidth={0} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}
