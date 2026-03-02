import Link from "next/link";
import Image from "next/image";
import { TrendingUp } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#020617] border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4">
          
          <div className="grid md:grid-cols-4 gap-12 mb-20 border-b border-white/5 pb-16">
              <div className="col-span-1 md:col-span-2 pr-8">
                  <Link href="/" className="text-2xl font-black tracking-tight block mb-6 text-white">
                      BABIMMO<span className="text-[#F59E0B]">.CI</span>
                  </Link>
                  <p className="text-slate-500 text-sm max-w-sm leading-relaxed mb-6">
                      La plateforme de référence pour les propriétaires bailleurs en Côte d'Ivoire. Sécurité juridique, paiements mobiles et sérénité d'esprit.
                  </p>
                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"></div>
                      <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"></div>
                      <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"></div>
                  </div>
              </div>
              
              <div>
                  <h4 className="font-bold text-white mb-6 uppercase text-[10px] tracking-[0.2em]">Plateforme</h4>
                  <ul className="space-y-4 text-sm text-slate-400 font-medium">
                      <li>
                          <Link href="/invest" className="hover:text-[#F59E0B] transition flex items-center gap-2 text-white font-bold">
                              <TrendingUp className="w-3 h-3 text-[#F59E0B]" /> Devenir Investisseur
                       </Link>
                   </li>
                   <li><Link href="/properties" className="hover:text-[#F59E0B] transition flex items-center gap-2">
                           Louer (Longue Durée)
                   </Link></li>
                      <li><a href="#features" className="hover:text-[#F59E0B] transition">Fonctionnalités</a></li>
                      <li><a href="#security" className="hover:text-[#F59E0B] transition">Sécurité</a></li>
                      <li><a href="#pricing" className="hover:text-[#F59E0B] transition">Tarifs</a></li>
                  </ul>
              </div>
              
              <div>
                  <h4 className="font-bold text-white mb-6 uppercase text-[10px] tracking-[0.2em]">Légal & Support</h4>
                  <ul className="space-y-4 text-sm text-slate-400 font-medium">
                      <li><Link href="/terms" className="hover:text-[#F59E0B] transition">CGU & Mentions Légales</Link></li>
                      <li><Link href="/privacy" className="hover:text-[#F59E0B] transition">Confidentialité (ARTCI)</Link></li>
                      <li><a href="mailto:support@babimmo.ci" className="hover:text-[#F59E0B] transition">Centre d'aide</a></li>
                  </ul>
              </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-8">
              <p className="text-slate-600 text-xs font-medium">
                  © {new Date().getFullYear()} Babimmo. Tous droits réservés.
              </p>
              <div className="flex items-center gap-4">
                  <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                      Une solution éditée par
                  </span>
                  <div className="opacity-50 hover:opacity-100 transition-opacity duration-300">
                      <Image src="/logo2.png" alt="WebappCi Logo" width={80} height={30} className="object-contain grayscale hover:grayscale-0 transition-all" />
                  </div>
              </div>
          </div>
      </div>
    </footer>
  );
}
