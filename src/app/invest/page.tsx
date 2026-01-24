'use client';

import React from 'react';
import Link from 'next/link'; // ✅ Import ajouté pour la navigation
import { 
  Target, 
  Users, 
  TrendingUp, 
  Heart, 
  CheckCircle2, 
  Smartphone,
  Globe,
  Server,
  ArrowRight
} from 'lucide-react';

// --- CONFIGURATION DE LA CAMPAGNE ---
const campaignStats = {
  goal: 50000000,       // Objectif: 50 Millions FCFA
  collected: 12500000,  // Déjà collecté
  backers: 142,         // Nombre de donateurs
  daysLeft: 25          // Jours restants
};

// Pourcentage de progression
const progressPercent = (campaignStats.collected / campaignStats.goal) * 100;

// Les "Packs" de contribution
const contributionTiers = [
  {
    id: 1,
    name: "Pack Supporter",
    amount: 5000,
    icon: <Heart className="w-6 h-6 text-red-500" />,
    benefits: ["Badge 'Early Believer' sur votre profil", "Remerciement sur nos réseaux sociaux"],
    popular: false
  },
  {
    id: 2,
    name: "Pack Ambassadeur",
    amount: 50000,
    icon: <Users className="w-6 h-6 text-blue-400" />,
    benefits: ["Accès anticipé à la Bêta", "3 mois d'abonnement Premium offerts", "Badge 'Ambassadeur'"],
    popular: true
  },
  {
    id: 3,
    name: "Pack Visionnaire",
    amount: 500000,
    icon: <TrendingUp className="w-6 h-6 text-[#F59E0B]" />,
    benefits: ["Participer aux réunions stratégiques (Trimestriel)", "Abonnement à vie gratuit", "Statut 'Investisseur Fondateur'"],
    popular: false
  }
];

export default function CrowdfundingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-[#F59E0B] selection:text-black p-6 md:p-10">
      
      {/* --- HEADER & TITRE --- */}
      <div className="max-w-5xl mx-auto mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-sm font-bold border border-[#F59E0B]/20 mb-6">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </span>
          Levée de fonds en cours
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
          Construisons le futur de <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] to-orange-600">
            l'Immobilier en Afrique
          </span>
        </h1>
        
        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Participez au développement d'ImmoFacile. Votre soutien nous permet de financer les serveurs, le développement de l'IA et l'expansion dans la sous-région.
        </p>
      </div>

      {/* --- PROGRESSION PRINCIPALE --- */}
      <div className="max-w-5xl mx-auto bg-[#0B1120] border border-white/10 p-8 rounded-3xl relative overflow-hidden shadow-2xl mb-16">
        {/* Glow effect background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl"></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 text-center md:text-left mb-8">
          <div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Montant Collecté</p>
            <p className="text-4xl font-black text-white">
              {campaignStats.collected.toLocaleString('fr-FR')} <span className="text-lg text-slate-500">FCFA</span>
            </p>
          </div>
          <div>
             <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Objectif</p>
             <p className="text-4xl font-black text-slate-400">
              {campaignStats.goal.toLocaleString('fr-FR')} <span className="text-lg text-slate-600">FCFA</span>
            </p>
          </div>
          <div>
             <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Contributeurs</p>
             <p className="text-4xl font-black text-[#F59E0B] flex items-center justify-center md:justify-start gap-2">
              {campaignStats.backers} <Users className="w-6 h-6 opacity-50"/>
            </p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="relative h-6 bg-slate-800 rounded-full overflow-hidden mb-4 border border-white/5">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#F59E0B] to-orange-600 transition-all duration-1000 ease-out flex items-center justify-end px-2"
            style={{ width: `${progressPercent}%` }}
          >
            <span className="text-[10px] font-black text-black">{progressPercent.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex justify-between text-xs font-medium text-slate-500">
          <span>Lancement</span>
          <span>Fin de campagne dans {campaignStats.daysLeft} jours</span>
        </div>
      </div>

      {/* --- ROADMAP (À quoi servira l'argent ?) --- */}
      <div className="max-w-5xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">À quoi servira votre financement ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0B1120] p-6 rounded-2xl border border-white/5 hover:bg-white/[0.02] transition text-center">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Server className="w-6 h-6"/>
                </div>
                <h3 className="font-bold text-white mb-2">Infrastructure Cloud</h3>
                <p className="text-sm text-slate-500">Financement des serveurs sécurisés et de la base de données pour gérer des milliers d'annonces.</p>
            </div>
            <div className="bg-[#0B1120] p-6 rounded-2xl border border-white/5 hover:bg-white/[0.02] transition text-center">
                <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-6 h-6"/>
                </div>
                <h3 className="font-bold text-white mb-2">Application Mobile</h3>
                <p className="text-sm text-slate-500">Développement des versions natives iOS et Android pour les agents sur le terrain.</p>
            </div>
            <div className="bg-[#0B1120] p-6 rounded-2xl border border-white/5 hover:bg-white/[0.02] transition text-center">
                <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-6 h-6"/>
                </div>
                <h3 className="font-bold text-white mb-2">Expansion Régionale</h3>
                <p className="text-sm text-slate-500">Marketing et déploiement légal au Sénégal et au Cameroun.</p>
            </div>
        </div>
      </div>

      {/* --- GRILLE DES DONS (Tiers) --- */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-8 text-center flex items-center justify-center gap-2">
          <Target className="w-6 h-6 text-[#F59E0B]" />
          Choisissez votre niveau d'impact
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contributionTiers.map((tier) => (
            <div 
              key={tier.id}
              className={`relative bg-[#0B1120] border rounded-3xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-2
                ${tier.popular 
                  ? 'border-[#F59E0B] shadow-[0_0_30px_rgba(245,158,11,0.1)]' 
                  : 'border-white/10 hover:border-white/20'
                }
              `}
            >
              {tier.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#F59E0B] text-[#020617] text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider">
                  Le plus populaire
                </div>
              )}

              <div className="mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border border-white/5 bg-white/5`}>
                  {tier.icon}
                </div>
                <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{tier.amount.toLocaleString('fr-FR')}</span>
                  <span className="text-slate-500 font-bold">FCFA</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {tier.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                    {benefit}
                  </li>
                ))}
              </ul>

              {/* ✅ MODIFICATION : Bouton connecté au Login avec paramètres */}
              <Link 
                href={`/login?type=investor&pack=${tier.id}&amount=${tier.amount}`}
                className={`w-full py-4 rounded-xl font-bold transition flex items-center justify-center gap-2
                  ${tier.popular
                    ? 'bg-[#F59E0B] hover:bg-orange-500 text-[#020617]'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  }
                `}
              >
                Contribuer {tier.amount.toLocaleString()} F <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
