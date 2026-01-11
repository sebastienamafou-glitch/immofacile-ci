"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { Printer, Lock, Eye, Database, Share2, ShieldCheck, UserCheck, Server, ArrowLeft, Mail } from "lucide-react";

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState("");

  // ScrollSpy pour la navigation latérale
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-100 pb-32">
      
      {/* --- HEADER AVEC LOGO --- */}
      <header className="bg-[#0B1120] text-white pt-20 pb-40 relative overflow-hidden print:hidden">
        {/* Effets de fond */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl -ml-40 -mt-40 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
            
            {/* LOGO CENTRÉ */}
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
                Politique de <span className="text-blue-500">Confidentialité</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Transparence totale sur la collecte, l'usage et la protection de vos données personnelles en conformité avec l'ARTCI.
            </p>
            
            <div className="mt-10 inline-flex items-center gap-3 bg-blue-500/10 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-500/20 text-blue-400">
                <ShieldCheck className="w-4 h-4" />
                Conforme Loi 2013-450
            </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-24 relative z-20 flex flex-col lg:flex-row gap-12">
        
        {/* --- NAVIGATION LATERALE --- */}
        <aside className="hidden lg:block w-72 shrink-0 print:hidden">
            <div className="sticky top-10 bg-white/80 backdrop-blur-xl p-3 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4 py-2">Navigation</p>
                <nav className="space-y-1">
                    {[
                        { id: 'collecte', label: '1. Données Collectées' },
                        { id: 'usage', label: '2. Finalité du Traitement' },
                        { id: 'partage', label: '3. Partage & Tiers' },
                        { id: 'securite', label: '4. Sécurité (V5)' },
                        { id: 'droits', label: '5. Vos Droits (ARTCI)' },
                        { id: 'cookies', label: '6. Cookies' },
                    ].map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => scrollTo(item.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 border-l-2 ${
                                activeSection === item.id 
                                ? 'bg-blue-50 text-blue-700 border-blue-500 shadow-sm translate-x-1' 
                                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-3 mt-4 border-t border-slate-100">
                    <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold h-10 rounded-xl transition">
                        <Printer className="w-4 h-4" /> IMPRIMER
                    </button>
                </div>
            </div>
        </aside>

        {/* --- CONTENU --- */}
        <main className="flex-1 space-y-6">
            
            <div className="lg:hidden mb-2 print:hidden">
                <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-900 font-bold text-sm">
                    <ArrowLeft className="w-4 h-4 mr-2"/> Retour
                </Link>
            </div>

            <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 space-y-16">

                {/* 1. COLLECTE */}
                <article id="collecte" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700"><Database className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">1. Données Collectées</h2>
                    </div>
                    <p className="text-slate-600 mb-6">
                        Nous collectons uniquement les données strictement nécessaires au fonctionnement du service de gestion locative.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <strong className="block text-slate-900 mb-2 flex items-center gap-2"><UserCheck className="w-4 h-4 text-blue-500"/> Identité & Contact</strong>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                                <li>Nom, Prénoms</li>
                                <li>Numéro de téléphone (Identifiant unique)</li>
                                <li>Adresse Email</li>
                                <li>Pièce d'identité (KYC - Propriétaires)</li>
                            </ul>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <strong className="block text-slate-900 mb-2 flex items-center gap-2"><Server className="w-4 h-4 text-purple-500"/> Données Techniques</strong>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                                <li>Contrats de bail signés</li>
                                <li>Historique des transactions financières</li>
                                <li>Logs de connexion (IP, Navigateur)</li>
                            </ul>
                        </div>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 2. USAGE */}
                <article id="usage" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Eye className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">2. Finalité du Traitement</h2>
                    </div>
                    <p className="text-slate-600 mb-4">Vos données sont traitées pour les finalités suivantes :</p>
                    <ul className="space-y-3">
                        <li className="flex gap-3 items-start text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">1</span>
                            <span><strong>Exécution du contrat :</strong> Génération des baux, quittances et encaissement des loyers.</span>
                        </li>
                        <li className="flex gap-3 items-start text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">2</span>
                            <span><strong>Obligations légales :</strong> Lutte contre la fraude, vérification d'identité (KYC) et archivage légal.</span>
                        </li>
                        <li className="flex gap-3 items-start text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">3</span>
                            <span><strong>Sécurité :</strong> Authentification par OTP et protection contre les accès non autorisés.</span>
                        </li>
                    </ul>
                </article>

                <hr className="border-slate-100" />

                {/* 3. PARTAGE */}
                <article id="partage" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Share2 className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">3. Partage des Données</h2>
                    </div>
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-xl mb-6">
                        <p className="text-orange-900 text-sm font-bold">
                            Nous ne vendons jamais vos données personnelles à des tiers à des fins publicitaires.
                        </p>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">Elles sont transmises uniquement à nos sous-traitants techniques :</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 border rounded-xl bg-slate-50"><span className="block font-black text-slate-800">CinetPay</span><span className="text-xs text-slate-500">Paiements</span></div>
                        <div className="p-4 border rounded-xl bg-slate-50"><span className="block font-black text-slate-800">Wave/OM</span><span className="text-xs text-slate-500">Mobile Money</span></div>
                        <div className="p-4 border rounded-xl bg-slate-50"><span className="block font-black text-slate-800">Neon Tech</span><span className="text-xs text-slate-500">Base de Données</span></div>
                        <div className="p-4 border rounded-xl bg-slate-50"><span className="block font-black text-slate-800">Cloudinary</span><span className="text-xs text-slate-500">Hébergement Photos</span></div>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 4. SECURITE */}
                <article id="securite" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Lock className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">4. Sécurité des Données</h2>
                    </div>
                    <p className="text-slate-600 mb-4">
                        Toutes les communications sont chiffrées selon les standards bancaires :
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">Protocole HTTPS / TLS 1.3</span>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">Algorithme Bcrypt (Mots de passe)</span>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">Sauvegardes chiffrées quotidiennes</span>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 5. DROITS (ARTCI) */}
                <article id="droits" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-white"><ShieldCheck className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">5. Vos Droits (ARTCI)</h2>
                    </div>
                    <p className="text-slate-600 mb-4">
                        Conformément à la <strong>Loi n° 2013-450 relative à la protection des données à caractère personnel</strong>, vous disposez des droits suivants :
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 mb-6">
                        <li>Droit d'accès et d'information.</li>
                        <li>Droit de rectification des données inexactes.</li>
                        <li>Droit à l'effacement ("Droit à l'oubli") sous réserve des obligations légales de conservation.</li>
                        <li>Droit d'opposition au traitement.</li>
                    </ul>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
                        <p className="text-sm font-medium text-slate-600 mb-2">Pour exercer ces droits, contactez notre Délégué à la Protection des Données (DPO) :</p>
                        <a href="mailto:privacy@immofacile.ci" className="inline-flex items-center gap-2 text-blue-600 font-black hover:underline text-lg">
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
