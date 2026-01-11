"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function FinanceChart({ stats }: { stats: any }) {
  
  const data = [
    { name: 'Revenus', amount: stats?.totalRent || 0, colorStart: '#4ade80', colorEnd: '#22c55e' }, // Vert Néon
    { name: 'Dépenses', amount: stats?.totalExpensesMonth || 0, colorStart: '#f87171', colorEnd: '#ef4444' }, // Rouge
    { name: 'Résultat', amount: stats?.netIncome || 0, colorStart: '#60a5fa', colorEnd: '#3b82f6' }, // Bleu
  ];

  // Tooltip Personnalisé (Le petit encadré au survol)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0B1120]/90 border border-slate-700 backdrop-blur-xl p-4 rounded-xl shadow-2xl">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
          <p className="text-xl font-black text-white">
            {payload[0].value.toLocaleString()} <span className="text-xs font-normal text-slate-500">FCFA</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#131b2e] border border-slate-800/60 p-6 rounded-[2rem] h-full flex flex-col relative overflow-hidden group">
        
        {/* Petit effet de lueur en fond */}
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
                <BarChart data={data} barSize={40}> 
                    {/* Définition des dégradés (SVG Standard) */}
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
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                        dy={15}
                    />
                    <YAxis hide />
                    
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }} />
                    
                    <Bar dataKey="amount" radius={[10, 10, 10, 10]}>
                        {data.map((entry, index) => (
                            /* CORRECTION ICI : Cell avec Majuscule */
                            <Cell key={`cell-${index}`} fill={`url(#gradient-${index})`} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}
