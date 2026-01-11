import React from 'react';

interface IncidentWidgetProps {
  count: number;
}

export default function IncidentWidget({ count }: IncidentWidgetProps) {
  return (
    <div className="bg-[#1e293b]/40 p-6 rounded-3xl border border-red-500/20 hover:border-red-500/40 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
        <h3 className="font-bold text-red-400 text-sm uppercase tracking-wide">
          Incidents
        </h3>
      </div>
      <p className="text-3xl font-black text-white">
        {count}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Requêtes non résolues.
      </p>
    </div>
  );
}
