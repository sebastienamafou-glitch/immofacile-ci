import { AlertCircle, Building2, ShieldCheck } from "lucide-react";

interface Incident {
  id: string;
  title: string;
  priority: string;
  propertyTitle: string;
}

interface MaintenanceAlertsProps {
  incidents: Incident[];
}

export default function MaintenanceAlerts({ incidents }: MaintenanceAlertsProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl min-h-[200px]">
         <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[60px] rounded-full pointer-events-none"></div>
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-white text-sm flex items-center gap-2">
                <AlertCircle className="text-red-500 w-4 h-4"/> MAINTENANCE
            </h3>
            <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[10px] font-black">
                {incidents.length}
            </span>
         </div>
         
         <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {incidents.length > 0 ? incidents.map((inc) => (
                <div key={inc.id} className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/10 transition cursor-pointer group">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-red-400 uppercase truncate max-w-[150px]">{inc.title}</span>
                        <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">URGENT</span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                         <Building2 className="w-3 h-3"/> {inc.propertyTitle}
                    </div>
                </div>
            )) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2 opacity-50">
                    <ShieldCheck className="w-10 h-10"/>
                    <span className="text-xs font-bold">Système Stable</span>
                </div>
            )}
         </div>
    </div>
  );
}
