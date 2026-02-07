"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { Printer, Lock, Eye, Database, Share2, ShieldCheck, UserCheck, Server, ArrowLeft, Mail, Fingerprint, History } from "lucide-react";

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState("");

  // ScrollSpy pour la navigation latérale
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("article");
      let current = "";
      sections.forEach((section) => {
        const top = (section as HTMLElement).offsetTop;
        if (window.scrollY >= top - 250) {
          current = section.id;
        }
      });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-100 pb-32">
      
      {/* --- HEADER --- */}
      <header className="bg-[#0B1120] text-white pt-20 pb-40 relative overflow-hidden print:hidden">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl -ml-40 -mt-40 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
            <div className="mb-8 p-3 bg-white/5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-sm">
                <Image src="/logo.png" alt="Logo ImmoFacile" width={80} height={80} className="object-contain" />
            </div>

            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
                Politique de <span className="text-blue-500">Confidentialité</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Transparence totale sur la collecte, l'usage et la protection de vos données en conformité avec l'ARTCI et le standard V5.
            </p>
            
            <div className="mt-10 inline-flex items-center gap-3 bg-blue-500/10 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-500/20 text-blue-400">
                <ShieldCheck className="w-4 h-4" />
                Révision Technique v6.0.0
            </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-24 relative z-20 flex flex-col lg:flex-row gap-12">
        
        {/* --- NAVIGATION --- */}
        <aside className="hidden lg:block w-72 shrink-0 print:hidden">
            <div className="sticky top-10 bg-white/80 backdrop-blur-xl p-3 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4 py-2">Sommaire</p>
                <nav className="space-y-1">
                    {[
                        { id: 'collecte', label: '1. Données Collectées' },
                        { id: 'usage', label: '2. Finalité du Traitement' },
                        { id: 'securite', label: '3. Audit & Intégrité' },
                        { id: 'droits', label: '4. Vos Droits (ARTCI)' },
                    ].map((item) => (
                        <button key={item.id} onClick={() => scrollTo(item.id)} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 border-l-2 ${activeSection === item.id ? 'bg-blue-50 text-blue-700 border-blue-500 shadow-sm translate-x-1' : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'}`}>
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>
        </aside>

        {/* --- CONTENU --- */}
        <main className="flex-1 space-y-6">
            <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 space-y-16">

                {/* 1. COLLECTE (Basé sur Prisma) */}
                <article id="collecte" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700"><Database className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">1. Nature des Données Collectées</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <strong className="block text-slate-900 mb-2 flex items-center gap-2 font-black text-xs uppercase tracking-widest text-blue-600">Identité & KYC</strong>
                            <ul className="space-y-2 text-sm text-slate-600 font-medium">
                                <li>Email & Téléphone (Identifiants uniques)</li>
                                <li>Documents d'identité chiffrés (idNumber)</li>
                                <li>Preuves de signature (SignatureProof)</li>
                            </ul>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <strong className="block text-slate-900 mb-2 flex items-center gap-2 font-black text-xs uppercase tracking-widest text-purple-600">Données Financières</strong>
                            <ul className="space-y-2 text-sm text-slate-600 font-medium">
                                <li>Historique des transactions (Transaction)</li>
                                <li>Soldes Wallet & Escrow (UserFinance)</li>
                                <li>Méthodes de paiement (WAVE/OM)</li>
                            </ul>
                        </div>
                    </div>
                </article>

                {/* 2. USAGE (Finalités Métier) */}
                <article id="usage" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Eye className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">2. Pourquoi traitons-nous vos données ?</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
                            <p className="text-sm text-slate-600"><strong>Vérification de Conformité :</strong> Validation des dossiers de location et contrôle LAB (Lutte Anti-Blanchiment) via le système KYC.</p>
                        </div>
                        <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <Fingerprint className="w-5 h-5 text-indigo-500 shrink-0" />
                            <p className="text-sm text-slate-600"><strong>Authentification Forte :</strong> Sécurisation des accès par sessions NextAuth et jetons JWT cryptographiques.</p>
                        </div>
                    </div>
                </article>

                {/* 3. SECURITE (Audit Trail) */}
                <article id="securite" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Lock className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">3. Audit & Intégrité des Données</h2>
                    </div>
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        Pour garantir une sécurité maximale, ImmoFacile utilise un mécanisme d'<strong>Audit Trail</strong> (Piste d'audit).
                    </p>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 font-mono text-xs text-blue-400">
                        <p className="flex items-center gap-2 mb-2"><History size={14} /> // Sécurité immuable</p>
                        <p>Transaction.previousHash = "Verrouillage cryptographique";</p>
                        <p>UserKYC.status = "Audit administrateur";</p>
                        <p>SignatureProof.documentHash = "SHA-256 Intégrité PDF";</p>
                    </div>
                </article>

                {/* 4. DROITS (Loi 2013-450) */}
                <article id="droits" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white"><ShieldCheck className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">4. Vos Droits (Loi Ivoirienne)</h2>
                    </div>
                    <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                        Conformément à la <strong>Loi n° 2013-450</strong>, vous disposez d'un droit d'accès, de rectification et de suppression de vos informations personnelles.
                    </p>
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-center">
                        <p className="text-xs font-bold text-blue-900 mb-2 uppercase tracking-widest">Délégué à la Protection (DPO)</p>
                        <a href="mailto:privacy@immofacile.ci" className="text-blue-600 font-black hover:underline text-lg flex items-center justify-center gap-2">
                            <Mail className="w-5 h-5" /> privacy@immofacile.ci
                        </a>
                    </div>
                </article>

            </div>
        </main>
      </div>
    </div>
  );
}
