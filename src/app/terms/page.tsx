"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { Button } from "@/components/ui/button";
import { Printer, Scale, CheckCircle, ShieldCheck, Mail, ArrowLeft, Lock, Gavel, FileText, AlertTriangle } from "lucide-react";

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState("");

  // ScrollSpy
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("article");
      let current = "";
      sections.forEach((section) => {
        const top = section.offsetTop;
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-orange-100 pb-0">
      
      {/* --- HEADER --- */}
      <header className="bg-[#0B1120] text-white pt-20 pb-40 relative overflow-hidden print:hidden">
        {/* Fond décoratif */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
            
            {/* LOGO IMMOFACILE */}
            <div className="mb-8 p-3 bg-white/5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-sm">
                <Image 
                    src="/logo.png" 
                    alt="Logo ImmoFacile" 
                    width={80} 
                    height={80} 
                    className="object-contain"
                />
            </div>

            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
                Mentions Légales <span className="text-orange-500">&</span> CGU
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Le cadre de confiance d'ImmoFacile V5. Transparence totale sur nos services, vos droits et vos obligations en Côte d'Ivoire.
            </p>
            
            <div className="mt-10 inline-flex items-center gap-3 bg-white/5 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10 text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-24 relative z-20 flex flex-col lg:flex-row gap-12 pb-24">
        
        {/* --- NAVIGATION LATERALE (Sticky) --- */}
        <aside className="hidden lg:block w-72 shrink-0 print:hidden">
            <div className="sticky top-10 bg-white/80 backdrop-blur-xl p-3 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4 py-2">Sommaire</p>
                <nav className="space-y-1">
                    {[
                        { id: 'mentions', label: '1. Éditeur & Contacts' },
                        { id: 'service', label: '2. Description du Service' },
                        { id: 'resp-fin', label: '3. Responsabilité Financière' },
                        { id: 'otp', label: '4. Signature Électronique' },
                        { id: 'loi2019', label: '5. Conformité Loi 2019' },
                        { id: 'donnees', label: '6. Données (ARTCI)' },
                    ].map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => scrollTo(item.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 border-l-2 ${
                                activeSection === item.id 
                                ? 'bg-orange-50 text-orange-700 border-orange-500 shadow-sm translate-x-1' 
                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-3 mt-4 border-t border-slate-100">
                    <Button variant="outline" onClick={() => window.print()} className="w-full gap-2 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 text-xs font-bold h-10 rounded-xl">
                        <Printer className="w-4 h-4" /> IMPRIMER LE DOCUMENT
                    </Button>
                </div>
            </div>
        </aside>

        {/* --- CONTENU JURIDIQUE --- */}
        <main className="flex-1 space-y-6">
            
            {/* Retour Mobile */}
            <div className="lg:hidden mb-2 print:hidden">
                <Link href="/">
                    <Button variant="ghost" className="text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4 mr-2"/> Retour</Button>
                </Link>
            </div>

            <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 space-y-16">

                {/* 1. MENTIONS LÉGALES */}
                <article id="mentions" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700"><Scale className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">1. Mentions Légales</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">L'Éditeur</p>
                            <p className="font-bold text-slate-900 text-lg mb-1">WebappCi SARL</p>
                            <div className="space-y-1 text-slate-600">
                                <p>Capital social : 1.000.000 FCFA</p>
                                <p>RCCM : CI-ABJ-202X-B-XXXXX</p>
                                <p>Siège social : Abidjan, Cocody Riviera Palmeraie</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Hébergement & Tech</p>
                            <div className="space-y-3 text-slate-600">
                                <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-black"></span> Vercel Inc. (Frontend)</p>
                                <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Neon Tech (Base de données)</p>
                                <a href="mailto:support@immofacile.ci" className="inline-flex items-center gap-2 text-orange-600 font-bold hover:underline mt-2">
                                    <Mail className="w-4 h-4" /> support@immofacile.ci
                                </a>
                            </div>
                        </div>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 2. OBJET DU SERVICE */}
                <article id="service" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><FileText className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">2. Description du Service</h2>
                    </div>
                    <p className="text-slate-600 leading-relaxed mb-6 text-justify">
                        La plateforme <strong>ImmoFacile V5</strong> est un logiciel de gestion locative en mode SaaS (Software as a Service). 
                        Elle permet aux propriétaires bailleurs de gérer leurs biens immobiliers, de générer des contrats, d'encaisser des loyers et de suivre leur comptabilité.
                    </p>
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-xl">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-orange-900">
                                <strong className="block mb-1 font-bold">Limitation de responsabilité</strong>
                                WebappCi agit en tant que <strong>prestataire technique</strong>. Nous ne sommes ni agence immobilière, ni administrateur de biens. 
                                Les contrats de bail sont conclus directement entre le Propriétaire et le Locataire.
                            </div>
                        </div>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 3. RESPONSABILITÉ FINANCIÈRE */}
                <article id="resp-fin" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Lock className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">3. Gestion des Fonds (Wallet)</h2>
                    </div>
                    <div className="space-y-4 text-slate-600 leading-relaxed">
                        <p>
                            Les flux financiers (loyers, cautions) transitent par des comptes de cantonnement sécurisés gérés par nos partenaires agréés (CinetPay, Wave, Orange Money).
                        </p>
                        <ul className="grid gap-3 mt-4">
                            <li className="bg-slate-50 p-4 rounded-xl flex gap-3 items-start border border-slate-100">
                                <div className="mt-1 bg-slate-200 p-1 rounded"><CheckCircle className="w-3 h-3 text-slate-600"/></div>
                                <div>
                                    <strong className="text-slate-900 text-sm block">Mandat d'Encaissement</strong>
                                    <span className="text-sm">En utilisant le service, le Propriétaire mandate ImmoFacile pour collecter les loyers en son nom et pour son compte.</span>
                                </div>
                            </li>
                            <li className="bg-slate-50 p-4 rounded-xl flex gap-3 items-start border border-slate-100">
                                <div className="mt-1 bg-slate-200 p-1 rounded"><CheckCircle className="w-3 h-3 text-slate-600"/></div>
                                <div>
                                    <strong className="text-slate-900 text-sm block">Commission de Service</strong>
                                    <span className="text-sm">Une commission de <strong>5% TTC</strong> est prélevée automatiquement sur chaque transaction (Loyer) avant crédit sur le Wallet du Propriétaire.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 4. SIGNATURE OTP */}
                <article id="otp" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><ShieldCheck className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">4. Signature Électronique</h2>
                    </div>
                    <p className="text-slate-600 mb-4">
                        Conformément à la <strong>Loi n° 2013-546</strong> relative aux transactions électroniques en Côte d'Ivoire :
                    </p>
                    <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100">
                        <ul className="space-y-3">
                            <li className="flex gap-3 items-center text-sm font-medium text-slate-700">
                                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-purple-600 font-bold">1</span>
                                L'identification par code SMS (OTP) vaut consentement irrévocable.
                            </li>
                            <li className="flex gap-3 items-center text-sm font-medium text-slate-700">
                                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-purple-600 font-bold">2</span>
                                L'empreinte numérique (Hash SHA-256) du contrat garantit son intégrité.
                            </li>
                            <li className="flex gap-3 items-center text-sm font-medium text-slate-700">
                                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-purple-600 font-bold">3</span>
                                Les journaux de connexion (Logs) sont conservés à titre de preuve.
                            </li>
                        </ul>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 5. LOI 2019 */}
                <article id="loi2019" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600"><Gavel className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">5. Conformité Loi 2019 (Bail)</h2>
                    </div>
                    <p className="text-slate-600 mb-4">
                        La plateforme intègre des verrous techniques ("Safety Check") pour garantir le respect de la <strong>Loi n° 2019-576</strong> du 26 juin 2019 :
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                            <strong className="block text-slate-900 mb-1">Caution (Dépôt de garantie)</strong>
                            <p className="text-sm text-slate-500">Strictement plafonnée à <strong>2 mois</strong> de loyer maximum.</p>
                        </div>
                        <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                            <strong className="block text-slate-900 mb-1">Loyer d'avance</strong>
                            <p className="text-sm text-slate-500">Strictement plafonné à <strong>2 mois</strong> de loyer maximum.</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4 italic">
                        Toute tentative de contournement de ces plafonds entraînera la suspension immédiate du compte Propriétaire.
                    </p>
                </article>

                <hr className="border-slate-100" />

                {/* 6. ARTCI */}
                <article id="donnees" className="scroll-mt-32">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">6. Données Personnelles (ARTCI)</h3>
                    <p className="text-slate-600 text-sm mb-4">
                        Les données collectées sont traitées conformément à la <strong>Loi n° 2013-450</strong> relative à la protection des données à caractère personnel.
                        Ce traitement a fait l'objet d'une déclaration préalable auprès de l'ARTCI.
                    </p>
                    <p className="text-slate-600 text-sm">
                        Vous disposez d'un droit d'accès, de rectification et de suppression de vos données en contactant notre DPO : 
                        <a href="mailto:privacy@immofacile.ci" className="text-blue-600 hover:underline ml-1">privacy@immofacile.ci</a>.
                    </p>
                </article>

            </div>
        </main>
      </div>

      {/* --- FOOTER (AJOUTÉ) --- */}
      <footer className="w-full bg-white border-t border-slate-200 py-16 print:hidden">
         <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-6">
            <div className="text-center space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Solution développée et éditée par</p>
            </div>
            
            {/* Logo WebappCi */}
            <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <Image
                    src="/logo2.png" 
                    alt="WebappCi Logo"
                    width={100}
                    height={100}
                    className="relative opacity-90 hover:opacity-100 transition-all transform hover:scale-105"
                />
            </div>

            <div className="flex items-center gap-6 mt-4">
                <p className="text-xs font-medium text-slate-500">
                    © {new Date().getFullYear()} WebappCi SARL
                </p>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <Link href="#" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
                    Support Technique
                </Link>
            </div>
         </div>
      </footer>
      
    </div>
  );
}
