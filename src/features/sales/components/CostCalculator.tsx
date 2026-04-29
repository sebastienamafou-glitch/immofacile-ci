'use client';

import { useState, useEffect } from 'react';
import { Calculator, Info, Landmark, FileText, Briefcase, Receipt } from 'lucide-react';

interface CostCalculatorProps {
  initialPrice: number;
}

export function CostCalculator({ initialPrice }: CostCalculatorProps) {
  const [price, setPrice] = useState(initialPrice);
  const [costs, setCosts] = useState({
    registration: 0,
    landRegistry: 0,
    notaryFees: 0,
    fixedCosts: 250000,
    totalCosts: 0,
    totalBudget: 0,
    percentage: 0
  });

  // Calcul dynamique des frais selon le barème ivoirien (Estimations)
  useEffect(() => {
    const registration = price * 0.04;      // 4% Droits d'enregistrement
    const landRegistry = price * 0.012;     // 1.2% Conservation foncière
    const notaryFees = price * 0.03;        // ~3% Émoluments du notaire
    const fixedCosts = 250000;              // Frais fixes divers

    const totalCosts = registration + landRegistry + notaryFees + fixedCosts;
    const totalBudget = price + totalCosts;
    const percentage = ((totalCosts / price) * 100).toFixed(1);

    setCosts({
      registration,
      landRegistry,
      notaryFees,
      fixedCosts,
      totalCosts,
      totalBudget,
      percentage: Number(percentage)
    });
  }, [price]);

  return (
    <div className="bg-white/5 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
          <Calculator className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white">Simulateur de Frais</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acquisition avec ACD</p>
        </div>
      </div>

      {/* CURSEUR DE PRIX (SLIDER) */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <label className="text-sm font-medium text-slate-300">Prix d'achat estimé</label>
          <span className="text-xl font-black text-orange-500">{price.toLocaleString()} FCFA</span>
        </div>
        <input 
          type="range" 
          min={Math.max(5000000, initialPrice * 0.5)} // Minimum 5M ou moitié du prix
          max={initialPrice * 1.5} // Jusqu'à 1.5x le prix
          step={1000000} // Pas de 1 million
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
        />
      </div>

      {/* DÉTAIL DES FRAIS */}
      <div className="space-y-3 mb-8">
        <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-slate-300">Droits d'enregistrement (4%)</span>
          </div>
          <span className="font-bold text-white">{costs.registration.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-slate-300">Conservation Foncière (1.2%)</span>
          </div>
          <span className="font-bold text-white">{costs.landRegistry.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-slate-300">Honoraires Notaire (~3%)</span>
          </div>
          <span className="font-bold text-white">{costs.notaryFees.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">Frais de dossier & Timbres</span>
          </div>
          <span className="font-bold text-white">{costs.fixedCosts.toLocaleString()}</span>
        </div>
      </div>

      {/* RÉCAPITULATIF */}
      <div className="pt-6 border-t border-slate-800">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-sm text-slate-400">Total Frais d'acquisition</p>
            <p className="text-xs font-bold text-orange-500/80">Environ {costs.percentage}% du prix</p>
          </div>
          <p className="text-2xl font-black text-white">
            {costs.totalCosts.toLocaleString()} <span className="text-sm text-slate-400">FCFA</span>
          </p>
        </div>
        
        <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start gap-3">
          <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Budget total recommandé : <strong className="text-orange-400">{costs.totalBudget.toLocaleString()} FCFA</strong>. Ces montants sont des estimations basées sur la législation ivoirienne. Le décompte final exact sera fourni par le Notaire instrumentaire.
          </p>
        </div>
      </div>
    </div>
  );
}
