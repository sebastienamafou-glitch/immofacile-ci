import { Star, Quote, ShieldCheck } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  location: string;
  content: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Amadou D.",
    role: "Propriétaire",
    location: "Yopougon",
    content: "Avant, je devais me déplacer chaque fin de mois pour récupérer mes loyers en espèces. Aujourd'hui, tout tombe directement sur mon compte Wave. C'est une tranquillité d'esprit incroyable."
  },
  {
    id: 2,
    name: "Sandrine K.",
    role: "Gérante d'agence",
    location: "Cocody Angré",
    content: "Les relances automatiques par SMS et les baux numériques ont radicalement fait baisser nos impayés. Fini les contestations de locataires et les dossiers papiers qui s'entassent."
  },
  {
    id: 3,
    name: "Marc E.",
    role: "Investisseur",
    location: "Marcory Zone 4",
    content: "J'avais peur que mes locataires n'adoptent pas le système. Finalement, payer par Orange Money leur facilite la vie. Le tableau de bord me donne une vision claire de ma rentabilité."
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-[#0f172a] border-y border-white/5 relative overflow-hidden">
      {/* --- BANDEAU PARTENAIRES (Social Proof institutionnel) --- */}
      <div className="max-w-7xl mx-auto px-4 mb-24">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">
          Vos fonds sont sécurisés par nos partenaires
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          {/* Remplacer par de vraies balises <Image /> avec les logos Wave, OM, MTN, ARTCI une fois les assets disponibles */}
          <div className="text-xl font-black text-white flex items-center gap-2"><div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs">W</div> Wave</div>
          <div className="text-xl font-black text-white flex items-center gap-2"><div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs">OM</div> Orange Money</div>
          <div className="text-xl font-black text-white flex items-center gap-2"><div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-xs text-black">M</div> MTN MoMo</div>
          <div className="text-sm font-bold text-slate-300 flex items-center gap-2 border-l border-white/10 pl-8 ml-4 hidden md:flex">
             <ShieldCheck className="w-5 h-5 text-emerald-500" /> Conforme ARTCI
          </div>
        </div>
      </div>

      {/* --- TÉMOIGNAGES --- */}
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-black text-white mb-4">Ils ont choisi la sérénité</h2>
          <p className="text-slate-400 text-lg">Rejoignez des centaines de bailleurs ivoiriens qui ont modernisé leur gestion.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((item) => (
            <div key={item.id} className="bg-[#020617] border border-white/5 p-8 rounded-3xl hover:border-[#F59E0B]/30 transition-colors relative group">
              <Quote className="absolute top-6 right-6 w-12 h-12 text-white/5 group-hover:text-[#F59E0B]/10 transition-colors" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              
              <p className="text-slate-300 text-sm leading-relaxed mb-8 relative z-10">
                "{item.content}"
              </p>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-white/10 font-bold text-white text-xs">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{item.name}</h4>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    {item.role} • {item.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
