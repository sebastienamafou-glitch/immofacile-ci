import React from 'react';
import Link from 'next/link';
import { prisma } from "@/lib/prisma"; // ✅ Connexion réelle à la DB
import { 
  Target, Users, TrendingUp, Heart, CheckCircle2, 
  ArrowRight 
} from 'lucide-react';

// Configuration de l'objectif
const CAMPAIGN_GOAL = 50000000;
const END_DATE = new Date('2026-03-05'); // Date de fin réelle

export default async function CrowdfundingPage() {
  // --- RÉCUPÉRATION DES DONNÉES RÉELLES ---
  // ✅ CORRECTION : Utilisation de 'investmentContract' au lieu de 'investment'
  const stats = await prisma.investmentContract.aggregate({
    _sum: { amount: true },
    _count: { id: true },
    where: { status: 'COMPLETED' } // Uniquement les contrats dont le paiement est confirmé
  });

  const collected = stats._sum.amount || 0;
  const backers = stats._count.id || 0;
  const progressPercent = Math.min((collected / CAMPAIGN_GOAL) * 100, 100);
  
  // Calcul du temps restant
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((END_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const contributionTiers = [
    { id: 1, name: "Pack Supporter", amount: 5000, icon: <Heart className="w-6 h-6 text-red-500" />, benefits: ["Badge 'Early Believer'", "Remerciement public"], popular: false },
    { id: 2, name: "Pack Ambassadeur", amount: 50000, icon: <Users className="w-6 h-6 text-blue-400" />, benefits: ["Accès anticipé Bêta", "3 mois Premium", "Badge Ambassadeur"], popular: true },
    { id: 3, name: "Pack Visionnaire", amount: 500000, icon: <TrendingUp className="w-6 h-6 text-[#F59E0B]" />, benefits: ["Réunions stratégiques", "Abonnement à vie", "Statut Fondateur"], popular: false }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-[#F59E0B] selection:text-black p-6 md:p-10">
      
      {/* HEADER & TITRE */}
      <div className="max-w-5xl mx-auto mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-sm font-bold border border-[#F59E0B]/20 mb-6">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </span>
          Campagne de Crowdfunding Live
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 leading-tight">
          Investissez dans <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] to-orange-600">
            l'Avenir de l'Immobilier
          </span>
        </h1>
      </div>

      {/* PROGRESSION RÉELLE DYNAMIQUE */}
      <div className="max-w-5xl mx-auto bg-[#0B1120] border border-white/10 p-8 rounded-3xl relative overflow-hidden shadow-2xl mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 text-center md:text-left mb-8">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total Collecté</p>
            <p className="text-4xl font-black text-white">
              {collected.toLocaleString('fr-FR')} <span className="text-lg text-slate-500 font-medium ml-1">FCFA</span>
            </p>
          </div>
          <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Objectif Final</p>
             <p className="text-4xl font-black text-slate-400">
              {CAMPAIGN_GOAL.toLocaleString('fr-FR')} <span className="text-lg text-slate-600 font-medium ml-1">FCFA</span>
            </p>
          </div>
          <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Investisseurs</p>
             <p className="text-4xl font-black text-[#F59E0B] flex items-center justify-center md:justify-start gap-2">
              {backers} <Users className="w-7 h-7 opacity-50"/>
            </p>
          </div>
        </div>

        {/* Barre de progression dynamique */}
        <div className="relative h-6 bg-slate-800 rounded-full overflow-hidden mb-4 border border-white/5 shadow-inner">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#F59E0B] to-orange-600 transition-all duration-1000 ease-out flex items-center justify-end px-2"
            style={{ width: `${progressPercent}%` }}
          >
            <span className="text-[10px] font-black text-black">{progressPercent.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-tighter">
          <span>Lancement</span>
          <span>{daysLeft} jours restants avant clôture</span>
        </div>
      </div>

      {/* GRILLE DES PALIERS */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-8 text-center flex items-center justify-center gap-3">
          <Target className="w-6 h-6 text-[#F59E0B]" />
          Choisissez votre niveau d'impact
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contributionTiers.map((tier) => (
            <div 
              key={tier.id}
              className={`relative bg-[#0B1120] border rounded-3xl p-8 flex flex-col transition-all duration-500 hover:-translate-y-2
                ${tier.popular ? 'border-[#F59E0B] shadow-[0_0_40px_rgba(245,158,11,0.15)]' : 'border-white/10 hover:border-white/20'}
              `}
            >
              {tier.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#F59E0B] text-[#020617] text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                  Le plus populaire
                </div>
              )}

              <div className="mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border border-white/5 bg-white/5 shadow-inner">
                  {tier.icon}
                </div>
                <h3 className="text-xl font-bold text-white uppercase tracking-tight">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{tier.amount.toLocaleString('fr-FR')}</span>
                  <span className="text-slate-500 font-bold text-sm">FCFA</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {tier.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-400 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                    {benefit}
                  </li>
                ))}
              </ul>

              {/* REDIRECTION VERS PAIEMENT RÉEL */}
              <Link 
                href={`/invest/confirm?pack=${tier.id}&amount=${tier.amount}`}
                className={`w-full py-5 rounded-xl font-black transition-all flex items-center justify-center gap-2 uppercase text-[11px] tracking-widest
                  ${tier.popular ? 'bg-[#F59E0B] hover:bg-orange-500 text-[#020617] shadow-lg shadow-orange-500/20' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}
                `}
              >
                Contribuer {tier.amount.toLocaleString()} F <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
