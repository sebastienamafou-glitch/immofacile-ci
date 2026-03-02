import { Banknote, PenTool, Gavel } from "lucide-react";

export default function Features() {
  return (
    <section id="features" className="py-32 bg-[#0B1120]/50 border-y border-white/5 relative">
      <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
              <h2 className="text-3xl lg:text-5xl font-black mb-6 text-white">Gérez votre patrimoine sans stress</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">Une suite d'outils complète pour piloter vos locations et sécuriser vos revenus, depuis votre téléphone.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group bg-[#020617] border border-white/5 p-8 rounded-[2rem] hover:border-[#F59E0B]/30 transition duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#F59E0B]/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-[#F59E0B] mb-8 border border-white/10 group-hover:scale-110 transition duration-500">
                      <Banknote className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">Paiements Mobiles</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                      Plus besoin de vous déplacer. Vos locataires paient directement par <strong>Wave, Orange Money ou MTN</strong>. Votre argent est sécurisé et disponible instantanément.
                  </p>
              </div>

              {/* Feature 2 */}
              <div className="group bg-[#020617] border border-white/5 p-8 rounded-[2rem] hover:border-[#F59E0B]/30 transition duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-purple-400 mb-8 border border-white/10 group-hover:scale-110 transition duration-500">
                      <PenTool className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">Contrats Numériques</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                      Générez des baux 100% conformes en 2 minutes. Vos locataires signent à distance sur leur smartphone, avec une validité reconnue par la justice ivoirienne.
                  </p>
              </div>

              {/* Feature 3 */}
              <div className="group bg-[#020617] border border-white/5 p-8 rounded-[2rem] hover:border-[#F59E0B]/30 transition duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-red-400 mb-8 border border-white/10 group-hover:scale-110 transition duration-500">
                      <Gavel className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">Finis les impayés</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                      Un retard de paiement ? Le système envoie des relances automatiques par SMS et vous permet de générer une <strong>Mise en Demeure</strong> officielle en un clic.
                  </p>
              </div>
          </div>
      </div>
    </section>
  );
}
