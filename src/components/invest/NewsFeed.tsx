'use client';

import useSWR from 'swr';
import { TrendingUp, ArrowUpRight, Loader2, Info } from "lucide-react";

// ✅ 1. TYPAGE STRICT DES DONNÉES API
interface NewsData {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

// ✅ 2. FETCHER SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function NewsFeed() {
  // 🔥 SWR en action : Gère le cache, le loading et s'auto-rafraîchit toutes les 60 secondes
  const { data, error, isLoading } = useSWR<{ success: boolean; news: NewsData[] }>(
    '/api/invest/news', 
    fetcher, 
    { refreshInterval: 60000 } 
  );

  const newsList = data?.news || [];

  return (
    <div className="bg-[#0B1120] border border-white/5 rounded-3xl p-6 relative overflow-hidden h-full flex flex-col">
        {/* Décoration de fond */}
        <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
            <TrendingUp className="w-32 h-32" />
        </div>
        
        <h3 className="font-bold text-white mb-6 text-sm uppercase tracking-wide relative z-10">
            Dernières Actualités
        </h3>
        
        <div className="space-y-6 relative z-10 before:absolute before:left-[15px] before:top-2 before:h-[90%] before:w-px before:bg-gradient-to-b before:from-white/10 before:to-transparent flex-1 overflow-y-auto custom-scrollbar">
            
            {/* ETAT : CHARGEMENT */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center h-32 opacity-50">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400 mb-2" />
                    <span className="text-xs text-slate-500">Synchronisation...</span>
                </div>
            )}

            {/* ETAT : ERREUR */}
            {error && (
                <div className="text-xs text-red-400 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                    Impossible de charger le flux d'actualités.
                </div>
            )}

            {/* ETAT : VIDE */}
            {!isLoading && !error && newsList.length === 0 && (
                <div className="text-xs text-slate-500 italic p-4">
                    Aucune actualité pour le moment.
                </div>
            )}

            {/* ETAT : SUCCÈS (Rendu dynamique) */}
            {!isLoading && newsList.map((news: NewsData, index: number) => {
                const isLatest = index === 0; // On met en valeur la toute première
                
                return (
                    <div 
                        key={news.id} 
                        className={`relative pl-8 transition ${isLatest ? '' : 'opacity-80 hover:opacity-100'}`}
                    >
                        {/* Icône de la timeline */}
                        <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center z-10
                            ${isLatest ? 'bg-blue-500/10 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-[#F59E0B]/10 border border-[#F59E0B]/20'}
                        `}>
                            {isLatest ? (
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            ) : (
                                <Info className="w-3 h-3 text-[#F59E0B]" />
                            )}
                        </div>

                        {/* En-tête de la news */}
                        <div className="flex items-center gap-2 mb-1">
                            {isLatest && (
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 rounded font-bold uppercase tracking-wide">
                                    Nouveau
                                </span>
                            )}
                            <span className="text-[10px] text-slate-500">
                                {new Date(news.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>

                        {/* Contenu */}
                        <p className={`text-sm text-white font-bold mb-1 transition cursor-pointer ${isLatest ? 'hover:text-blue-400' : ''}`}>
                            {news.title}
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            {news.message}
                        </p>
                    </div>
                );
            })}
        </div>
        
        {/* Bouton d'action */}
        <button className="w-full mt-4 py-3 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition flex items-center justify-center gap-2 relative z-10">
            Voir tout l'historique <ArrowUpRight className="w-3 h-3" />
        </button>
    </div>
  );
}
