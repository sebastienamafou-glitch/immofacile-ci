import Link from "next/link";
import { Check, CheckCircle } from "lucide-react";

export default function Pricing() {
  return (
    <section id="pricing" className="py-32 bg-[#020617] relative">
      <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
              <h2 className="text-3xl lg:text-4xl font-black mb-4 text-white">Tarification Simple</h2>
              <p className="text-slate-400">Pas de frais cachés. Pas d'abonnement mensuel fixe.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Plan Découverte */}
              <div className="bg-[#0B1120] border border-white/5 p-8 rounded-[2rem] hover:border-white/10 transition">
                  <h3 className="text-lg font-bold text-white mb-2">Découverte</h3>
                  <p className="text-3xl font-black text-slate-400 mb-1">0 FCFA</p>
                  <p className="text-xs text-slate-500 mb-8 font-medium uppercase tracking-wide">Pour tester</p>
                  <ul className="space-y-4 text-sm text-slate-300 mb-10">
                      <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> 1 Bien immobilier</li>
                      <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Contrats standards</li>
                      <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Support Email</li>
                  </ul>
                  <Link href="/signup" className="block w-full py-3 rounded-xl border border-white/10 text-center font-bold text-white hover:bg-white/5 transition text-sm">S'inscrire</Link>
              </div>

              {/* Plan Standard (Mis en avant) */}
              <div className="bg-[#0f172a] border border-[#F59E0B] p-8 rounded-[2rem] relative shadow-[0_0_40px_rgba(245,158,11,0.1)] transform md:-translate-y-4">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#F59E0B] text-[#020617] text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                      Populaire
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Propriétaire</h3>
                  <p className="text-4xl font-black text-[#F59E0B] mb-1">5%</p>
                  <p className="text-xs text-slate-400 mb-8 font-medium uppercase tracking-wide">Par loyer encaissé</p>
                  <ul className="space-y-4 text-sm text-slate-300 mb-10 font-medium">
                      <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-[#F59E0B] shrink-0" /> Biens illimités</li>
                      <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-[#F59E0B] shrink-0" /> Paiements Wave/OM</li>
                      <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-[#F59E0B] shrink-0" /> Signature Électronique</li>
                      <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-[#F59E0B] shrink-0" /> Gestion Incidents</li>
                  </ul>
                  <Link href="/signup" className="block w-full py-4 rounded-xl bg-[#F59E0B] text-[#020617] text-center font-black hover:bg-orange-500 transition shadow-lg text-sm uppercase tracking-wide">Choisir ce plan</Link>
              </div>

              {/* Plan Agence */}
              <div className="bg-[#0B1120] border border-white/5 p-8 rounded-[2rem] hover:border-white/10 transition">
                  <h3 className="text-lg font-bold text-white mb-2">Agence</h3>
                  <p className="text-3xl font-black text-white mb-1">Sur Mesure</p>
                  <p className="text-xs text-slate-500 mb-8 font-medium uppercase tracking-wide">+50 lots</p>
                  <ul className="space-y-4 text-sm text-slate-300 mb-10">
                      <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Multi-comptes</li>
                      <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> API dédiée</li>
                      <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Marque blanche</li>
                  </ul>
                  <a href="mailto:sales@babimmo.ci" className="block w-full py-3 rounded-xl border border-white/10 text-center font-bold text-white hover:bg-white/5 transition text-sm">Contacter Sales</a>
              </div>
          </div>
      </div>
    </section>
  );
}
