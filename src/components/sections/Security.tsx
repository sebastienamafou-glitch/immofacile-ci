import { CheckCircle, Lock } from "lucide-react";

export default function Security() {
  return (
    <section id="security" className="py-32 overflow-hidden bg-[#020617]">
      <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
              {/* Visualisation Document */}
              <div className="order-2 lg:order-1 relative flex justify-center">
                  <div className="absolute inset-0 bg-[#F59E0B]/10 rounded-full blur-[100px]"></div>
                  <div className="relative w-full max-w-sm bg-[#0B1120] border border-white/10 p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
                      {/* En-tête document */}
                      <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-6">
                          <div>
                              <h4 className="text-white font-bold text-sm tracking-widest uppercase">Contrat de Bail</h4>
                              <p className="text-[10px] text-slate-500 mt-1 font-mono">ID: LEASE-884-XJ</p>
                          </div>
                          <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-500/20">
                              <CheckCircle className="w-3 h-3" /> Signé & Scellé
                          </div>
                      </div>

                      {/* Contenu simulé */}
                      <div className="space-y-4 mb-8 opacity-30">
                          <div className="h-2 bg-slate-500 rounded w-3/4"></div>
                          <div className="h-2 bg-slate-500 rounded w-full"></div>
                          <div className="h-2 bg-slate-500 rounded w-5/6"></div>
                          <div className="h-2 bg-slate-500 rounded w-full"></div>
                      </div>

                      {/* Bloc Preuve Numérique */}
                      <div className="bg-[#020617] rounded-xl p-4 border border-white/5 relative overflow-hidden">
                          <div className="flex items-center gap-2 mb-3 text-[#F59E0B]">
                              <Lock className="w-3 h-3" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Scellement Numérique Légal</span>
                          </div>
                          <div className="font-mono text-[9px] text-slate-500 break-all leading-relaxed">
                              0x8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4
                          </div>
                      </div>
                  </div>
              </div>

              {/* Texte commercial */}
              <div className="order-1 lg:order-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 mb-8 uppercase tracking-widest">
                      <Lock className="w-3 h-3 text-[#F59E0B]" /> Reconnu par les tribunaux
                  </div>
                  <h2 className="text-4xl lg:text-5xl font-black mb-8 leading-tight text-white">
                      Vos contrats,<br />
                      <span className="text-[#F59E0B]">blindés par la loi.</span>
                  </h2>
                  <p className="text-slate-400 mb-10 text-lg leading-relaxed">
                      Oubliez la paperasse. Chaque bail est scellé numériquement et validé par un code SMS unique. Il devient infalsifiable et vous protège totalement en cas d'impayé ou de litige.
                  </p>

                  <div className="space-y-8">
                      <div className="flex gap-6">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                              <span className="font-black text-[#F59E0B] text-lg">1</span>
                          </div>
                          <div>
                              <h4 className="font-bold text-lg text-white mb-2">Locataires Vérifiés</h4>
                              <p className="text-sm text-slate-400 leading-relaxed">Nous contrôlons la validité des pièces d'identité pour vous épargner les fausses déclarations et les mauvaises surprises.</p>
                          </div>
                      </div>
                      <div className="flex gap-6">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                              <span className="font-black text-[#F59E0B] text-lg">2</span>
                          </div>
                          <div>
                              <h4 className="font-bold text-lg text-white mb-2">Signature par SMS</h4>
                              <p className="text-sm text-slate-400 leading-relaxed">Le locataire valide le bail directement depuis son téléphone. C'est immédiat et strictement encadré par la Loi 2013-546.</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </section>
  );
}
