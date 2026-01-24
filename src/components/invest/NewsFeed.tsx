'use client';

import { TrendingUp, ArrowUpRight } from "lucide-react";

export default function NewsFeed() {
  return (
    <div className="bg-[#0B1120] border border-white/5 rounded-3xl p-6 relative overflow-hidden h-full flex flex-col">
        {/* Décoration de fond */}
        <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
            <TrendingUp className="w-32 h-32" />
        </div>
        
        <h3 className="font-bold text-white mb-6 text-sm uppercase tracking-wide relative z-10">Dernières Actualités</h3>
        
        <div className="space-y-6 relative z-10 before:absolute before:left-[15px] before:top-2 before:h-[90%] before:w-px before:bg-gradient-to-b before:from-white/10 before:to-transparent flex-1">
            
            {/* News 1 */}
            <div className="relative pl-8">
                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center z-10 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 rounded font-bold uppercase tracking-wide">En direct</span>
                    <span className="text-[10px] text-slate-500">Aujourd'hui</span>
                </div>
                <p className="text-sm text-white font-bold mb-1 hover:text-blue-400 transition cursor-pointer">Partenariat Wave Mobile Money</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                    L'intégration API est finalisée. Les encaissements de loyers sont désormais instantanés et sécurisés via Wave CI.
                </p>
            </div>

            {/* News 2 */}
            <div className="relative pl-8 opacity-80 hover:opacity-100 transition">
                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center z-10">
                    <span className="w-2 h-2 bg-[#F59E0B] rounded-full"></span>
                </div>
                <p className="text-[10px] text-slate-500 mb-1">Il y a 5 jours</p>
                <p className="text-sm text-white font-bold mb-1">Objectif T1 atteint ! 🚀</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                    Nous avons dépassé les 500 biens sous gestion active. Merci de votre confiance pour cette croissance exponentielle.
                </p>
            </div>
        </div>
        
        <button className="w-full mt-4 py-3 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition flex items-center justify-center gap-2 relative z-10">
            Voir tout l'historique <ArrowUpRight className="w-3 h-3" />
        </button>
    </div>
  );
}
