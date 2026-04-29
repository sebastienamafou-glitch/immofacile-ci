import Link from "next/link";
import { 
  Search, Bell, TrendingUp, Wallet, FileSignature, ShieldCheck 
} from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Gradients Subtils */}
      <div className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full z-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen"></div>
          <div className="absolute bottom-0 right-1/3 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
              
              <div className="text-center lg:text-left">
                 {/* Badge de réassurance */}
                 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-emerald-400 mb-8 backdrop-blur-md">
                     <ShieldCheck className="w-4 h-4" />
                     Baux numériques reconnus par la loi ivoirienne
            </div>
  
                 {/* Titre orienté Bénéfice */}
                 <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6 text-white">
                     Encaissez vos loyers. <br />
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] to-orange-500">Sans courir après.</span>
            </h1>
    
                  {/* Sous-titre clarifié */}
                  <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
                      Fini les fichiers Excel et les retards. Automatisez la collecte de vos loyers via <strong className="text-white">Wave et Orange Money</strong>, signez vos baux à distance et sécurisez votre patrimoine.
            </p>

                  {/* Call to Action */}
                  <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                      <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-[#F59E0B] hover:bg-orange-500 text-[#020617] font-black rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.2)] transition transform hover:scale-105 flex items-center justify-center gap-2 text-sm uppercase tracking-wide">
                          Créer mon compte gratuit
                      </Link>
                      <Link href="/sales" className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-orange-500/20 text-white font-bold rounded-xl border border-white/10 hover:border-orange-500/50 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide group">
                          <ShieldCheck className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" /> 
                          <span>Acheter (ACD)</span>
                      </Link>
                      <Link href="/properties" className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition flex items-center justify-center gap-2 text-sm uppercase tracking-wide group">
                          <Search className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" /> 
                          <span>Louer</span>
                      </Link>
                  </div>
              </div>

              {/* --- MOCKUP DASHBOARD RAFFINÉ --- */}
              <div className="relative lg:h-[600px] flex items-center justify-center perspective-[2000px]">
                  {/* Carte principale Dashboard */}
                  <div className="relative w-full max-w-md bg-[#0f172a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl transform rotate-y-6 hover:rotate-y-0 transition duration-700 ease-out group">
                      
                      {/* Header Dashboard */}
                      <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                                  <span className="font-bold text-white text-xs">EY</span>
                              </div>
                              <div>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Portefeuille</p>
                                  <p className="font-bold text-white text-sm">Effossou Yannick</p>
                              </div>
                          </div>
                          <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
                              <Bell className="w-4 h-4 text-[#F59E0B]" />
                          </div>
                      </div>

                      {/* Balance Card */}
                      <div className="bg-gradient-to-br from-[#F59E0B] to-orange-700 rounded-2xl p-6 mb-8 shadow-lg relative overflow-hidden group-hover:shadow-orange-500/20 transition-all">
                          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                          <p className="text-orange-100/80 text-xs font-bold uppercase tracking-widest mb-2">Solde Disponible</p>
                          <h3 className="text-4xl font-black text-white mb-6 tracking-tight">450.000 <span className="text-lg opacity-80 font-medium">FCFA</span></h3>
                          <div className="flex items-center gap-2">
                              <div className="bg-black/20 backdrop-blur px-3 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                                  <TrendingUp className="w-3 h-3" /> +12% vs M-1
                              </div>
                          </div>
                      </div>

                      {/* Recent Activity */}
                      <div>
                          <div className="flex justify-between items-end mb-4">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Derniers Mouvements</p>
                          </div>
                          <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition cursor-default">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                                          <Wallet className="w-4 h-4" />
                                      </div>
                                      <div>
                                          <p className="text-xs font-bold text-white">Loyer Janvier</p>
                                          <p className="text-[10px] text-slate-500">Appt A4 • Cocody</p>
                                      </div>
                                  </div>
                                  <span className="text-xs font-bold text-emerald-400">+150.000</span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition cursor-default">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                                          <FileSignature className="w-4 h-4" />
                                      </div>
                                      <div>
                                          <p className="text-xs font-bold text-white">Bail Signé</p>
                                          <p className="text-[10px] text-slate-500">M. Amafou</p>
                                      </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded">Vérifié</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Badge flottant "Secure" */}
                  <div className="absolute -bottom-8 -left-8 bg-[#020617]/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-800 shadow-2xl flex items-center gap-4 z-20 hover:border-emerald-500/50 transition-colors">
                       <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                           <ShieldCheck className="w-5 h-5" />
                       </div>
                       <div>
                           <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sécurité Bancaire</p>
                           <p className="text-sm font-black text-white">Chiffrement AES-256</p>
                       </div>
                   </div>
              </div>

          </div>
      </div>
    </section>
  );
}
