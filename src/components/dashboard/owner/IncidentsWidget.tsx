import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface IncidentWidgetProps {
  count: number;
}

export default function IncidentWidget({ count }: IncidentWidgetProps) {
  // Détermine la couleur selon la gravité
  const hasIncidents = count > 0;
  
  return (
    <Link 
      href="/dashboard/owner/maintenance" 
      className={`group relative p-6 rounded-[2rem] border transition-all duration-300 flex flex-col justify-between h-full overflow-hidden
        ${hasIncidents 
            ? 'bg-[#1e293b]/40 border-red-500/20 hover:border-red-500/50 hover:bg-[#1e293b]/60' 
            : 'bg-[#1e293b]/20 border-slate-800 hover:border-slate-700'
        }`}
    >
      {/* Fond lumineux si urgent */}
      {hasIncidents && (
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
      )}

      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-2">
           {hasIncidents ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
           ) : (
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
           )}
           <h3 className={`font-bold text-sm uppercase tracking-wide ${hasIncidents ? 'text-red-400' : 'text-slate-400'}`}>
             Incidents
           </h3>
        </div>
        <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${hasIncidents ? 'text-red-500' : 'text-slate-600'}`} />
      </div>

      <div className="relative z-10">
        <p className="text-4xl font-black text-white">
            {count}
        </p>
        <p className="text-xs text-slate-500 mt-1 font-medium">
            {hasIncidents ? 'Nécessitent votre attention.' : 'Tout est calme.'}
        </p>
      </div>
    </Link>
  );
}
