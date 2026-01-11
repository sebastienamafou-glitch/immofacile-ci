"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, RefreshCcw, ArrowLeft, Wallet } from "lucide-react";
import { Suspense } from "react";

function InsufficientContent() {
  const router = useRouter();
  const params = useSearchParams();
  const missing = parseInt(params.get('missing') || '0');

  return (
    <div className="max-w-md w-full bg-[#0F172A] border border-white/5 rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-2xl">
      
      {/* Effets visuels d'arrière-plan */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 to-orange-600"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 blur-[50px] rounded-full pointer-events-none"></div>
      
      {/* Icône d'alerte */}
      <div className="mb-6 inline-flex p-6 bg-red-500/5 rounded-3xl border border-red-500/10 shadow-xl shadow-red-900/10 animate-pulse">
          <AlertTriangle className="w-12 h-12 text-red-500" />
      </div>

      <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Paiement Refusé</h1>
      <p className="text-slate-400 text-sm mb-8 px-2 leading-relaxed font-medium">
          Votre solde Mobile Money semble insuffisant pour couvrir le montant de la transaction.
      </p>

      {/* Affichage du montant manquant (si connu) */}
      {missing > 0 && (
          <div className="bg-[#0B1120] rounded-2xl p-5 border border-white/5 mb-8 relative group">
              <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
              <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-[0.2em] flex items-center justify-center gap-2">
                  <Wallet className="w-3 h-3" /> Manque estimé
              </p>
              <p className="text-4xl font-black text-red-500 tracking-tighter">{missing.toLocaleString()} <span className="text-sm text-red-500/50">F</span></p>
          </div>
      )}

      <div className="space-y-3">
          {/* Bouton Réessayer : Retourne au formulaire */}
          <button 
            onClick={() => router.back()} 
            className="w-full h-16 bg-white hover:bg-slate-200 text-black font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98]"
          >
              <RefreshCcw className="w-4 h-4" /> Réessayer
          </button>
          
          {/* Bouton Annuler : Retourne au Dashboard */}
          <button 
            onClick={() => router.push('/dashboard/tenant')} 
            className="w-full py-4 text-slate-500 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
              <ArrowLeft className="w-3 h-3"/> Annuler la transaction
          </button>
      </div>
    </div>
  );
}

export default function InsufficientFundsPage() {
  return (
    <div className="min-h-screen bg-[#060B18] flex items-center justify-center p-4 font-sans">
       <Suspense fallback={<div className="text-white font-bold animate-pulse">Analyse de la transaction...</div>}>
          <InsufficientContent />
       </Suspense>
    </div>
  );
}
