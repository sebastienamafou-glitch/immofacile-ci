import Link from "next/link";
import { Building2, Palmtree, ArrowRight } from "lucide-react";

export default function Marketplace() {
  return (
    <section className="py-32 bg-[#0f172a] relative border-t border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F59E0B]/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-4xl font-black text-white mb-6">Vous cherchez un logement ?</h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Que ce soit pour la vie ou pour un week-end, nous avons la clé qu'il vous faut.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                
                {/* CARTE LONGUE DURÉE */}
                <Link href="/properties" className="group relative bg-[#020617] border border-white/10 rounded-[2.5rem] p-8 hover:border-[#F59E0B]/50 transition duration-500 overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#F59E0B]/0 to-[#F59E0B]/5 group-hover:opacity-100 opacity-0 transition duration-500"></div>
                    
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition duration-500 z-10">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-white mb-2 z-10">Location Longue Durée</h3>
                    <p className="text-slate-400 text-sm mb-8 z-10 leading-relaxed max-w-xs">
                        Trouvez votre résidence principale parmi des milliers de villas et appartements vérifiés.
                    </p>
                    
                    <span className="mt-auto inline-flex items-center gap-2 text-[#F59E0B] font-bold uppercase text-xs tracking-widest z-10 group-hover:gap-4 transition-all">
                        Parcourir les annonces <ArrowRight className="w-4 h-4" />
                    </span>
                </Link>

                {/* CARTE COURTE DURÉE (AKWABA) */}
                <Link href="/akwaba" className="group relative bg-[#020617] border border-white/10 rounded-[2.5rem] p-8 hover:border-emerald-500/50 transition duration-500 overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 group-hover:opacity-100 opacity-0 transition duration-500"></div>
                    
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition duration-500 z-10">
                        <Palmtree className="w-8 h-8 text-emerald-400" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-white mb-2 z-10">Séjours & Vacances</h3>
                    <p className="text-slate-400 text-sm mb-8 z-10 leading-relaxed max-w-xs">
                        Villas de luxe, résidences meublées et lofts pour vos voyages d'affaires ou détente.
                    </p>
                    
                    <span className="mt-auto inline-flex items-center gap-2 text-emerald-400 font-bold uppercase text-xs tracking-widest z-10 group-hover:gap-4 transition-all">
                        Découvrir Akwaba <ArrowRight className="w-4 h-4" />
                    </span>
                </Link>

            </div>
        </div>
    </section>
  );
}
