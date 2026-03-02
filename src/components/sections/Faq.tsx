import { ChevronDown } from "lucide-react";

export default function Faq() {
  return (
    <section className="py-24 border-t border-white/5 bg-[#020617]">
      <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-black mb-10 text-center text-white">Questions Fréquentes</h2>
          
          <div className="space-y-4">
              <details className="group bg-[#0B1120] border border-white/5 rounded-2xl p-6 cursor-pointer open:bg-white/[0.02] transition">
                  <summary className="font-bold flex justify-between items-center text-white list-none text-sm hover:text-[#F59E0B] transition-colors">
                      Comment récupérer mon argent ?
                      <ChevronDown className="w-5 h-5 text-slate-500 group-open:rotate-180 transition" />
                  </summary>
                  <p className="text-slate-400 text-sm mt-4 leading-relaxed pl-1">
                      Dès qu'un locataire paie, votre solde est crédité. Vous demandez un retrait vers votre numéro Wave ou Orange Money depuis votre dashboard. Le transfert est exécuté instantanément 24/7.
                  </p>
              </details>

              <details className="group bg-[#0B1120] border border-white/5 rounded-2xl p-6 cursor-pointer open:bg-white/[0.02] transition">
                  <summary className="font-bold flex justify-between items-center text-white list-none text-sm hover:text-[#F59E0B] transition-colors">
                      Le bail numérique est-il légal ?
                      <ChevronDown className="w-5 h-5 text-slate-500 group-open:rotate-180 transition" />
                  </summary>
                  <p className="text-slate-400 text-sm mt-4 leading-relaxed pl-1">
                      Oui. La Loi n° 2013-546 reconnaît la signature électronique en Côte d'Ivoire. Nos baux respectent également les plafonds de caution de la Loi de 2019.
                  </p>
              </details>
              
              <details className="group bg-[#0B1120] border border-white/5 rounded-2xl p-6 cursor-pointer open:bg-white/[0.02] transition">
                  <summary className="font-bold flex justify-between items-center text-white list-none text-sm hover:text-[#F59E0B] transition-colors">
                      Qui paie les frais de service ?
                      <ChevronDown className="w-5 h-5 text-slate-500 group-open:rotate-180 transition" />
                  </summary>
                  <p className="text-slate-400 text-sm mt-4 leading-relaxed pl-1">
                      La commission de 5% est déduite du loyer versé par le locataire. C'est le propriétaire qui supporte ce coût pour bénéficier de l'automatisation et de la sécurité, mais il économise les 10% à 15% qu'une agence classique facturerait.
                  </p>
              </details>
          </div>
      </div>
    </section>
  );
}
