"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { Button } from "@/components/ui/button";
import { 
  Printer, Scale, CheckCircle, ShieldCheck, Mail, 
  ArrowLeft, Lock, Gavel, FileText, AlertTriangle, 
  Fingerprint, Wallet 
} from "lucide-react";

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState("");

  // Système de suivi du défilement (ScrollSpy)
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-orange-100 pb-0">
      
      {/* --- HEADER --- */}
      <header className="bg-[#0B1120] text-white pt-20 pb-40 relative overflow-hidden print:hidden">
        {/* Effets de fond décoratifs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
            
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
                Le cadre de confiance d'ImmoFacile V5. Transparence totale sur nos services, vos droits et nos obligations techniques.
            </p>
            
            <div className="mt-10 inline-flex items-center gap-3 bg-white/5 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10 text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Mise à jour conforme : Schéma v6.0.0
            </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-24 relative z-20 flex flex-col lg:flex-row gap-12 pb-24">
        
        {/* --- NAVIGATION LATERALE (Sticky) --- */}
        <aside className="hidden lg:block w-72 shrink-0 print:hidden">
            <div className="sticky top-10 bg-white/80 backdrop-blur-xl p-3 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4 py-2">Sommaire juridique</p>
                <nav className="space-y-1">
                    {[
                        { id: 'mentions', label: '1. Éditeur & Contacts' },
                        { id: 'service', label: '2. Description du Service' },
                        { id: 'finance', label: '3. Gestion Financière (Wallet)' },
                        { id: 'kyc', label: '4. Conformité KYC & LAB' },
                        { id: 'signature', label: '5. Preuve de Signature' },
                        { id: 'loi2019', label: '6. Conformité Loi 2019' },
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
                        <Printer className="w-4 h-4" /> IMPRIMER LES CGU
                    </Button>
                </div>
            </div>
        </aside>

        {/* --- CONTENU JURIDIQUE --- */}
        <main className="flex-1 space-y-6">
            
            <div className="lg:hidden mb-2 print:hidden">
                <Link href="/">
                    <Button variant="ghost" className="text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4 mr-2"/> Retour Accueil</Button>
                </Link>
            </div>

            <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 space-y-16">

                {/* 1. ÉDITEUR */}
                <article id="mentions" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700"><Scale className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">1. Éditeur du Service</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">L'Éditeur</p>
                            <p className="font-bold text-slate-900 text-lg mb-1">WebappCi SARL</p>
                            <div className="space-y-1 text-slate-600">
                                <p>RCCM : CI-ABJ-202X-B-XXXXX</p>
                                <p>Siège social : Abidjan, Cocody</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Support Technique</p>
                            <div className="space-y-3">
                                <a href="mailto:support@immofacile.ci" className="inline-flex items-center gap-2 text-orange-600 font-bold hover:underline">
                                    <Mail className="w-4 h-4" /> support@immofacile.ci
                                </a>
                            </div>
                        </div>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 2. DESCRIPTION DU SERVICE */}
                <article id="service" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><FileText className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">2. Description du Service</h2>
                    </div>
                    <p className="text-slate-600 leading-relaxed mb-6 text-justify">
                        La plateforme <strong>ImmoFacile V5</strong> est un logiciel de gestion locative et immobilière en mode SaaS. 
                        Elle permet d'automatiser le cycle de vie du bail, de la prospection à l'encaissement final.
                    </p>
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-xl">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-orange-900">
                                <strong className="block mb-1 font-bold">Nature du service</strong>
                                WebappCi agit comme <strong>prestataire technique</strong>. Les contrats sont conclus directement entre les parties (Bailleur/Locataire/Investisseur).
                            </div>
                        </div>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 3. GESTION FINANCIÈRE */}
                <article id="finance" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Wallet className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">3. Gestion Financière & Wallet</h2>
                    </div>
                    <div className="space-y-4 text-slate-600 text-sm leading-relaxed text-justify">
                        <p>
                            Le système repose sur une infrastructure de <strong>portefeuille numérique (UserFinance)</strong> distinguant les fonds disponibles des fonds sous séquestre (Escrow).
                        </p>
                        <ul className="space-y-3">
                            <li className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                <span><strong>Conformité BCEAO :</strong> Les transactions respectent les plafonds de volume mensuel selon le niveau de vérification de l'utilisateur.</span>
                            </li>
                            <li className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                <span><strong>Traçabilité (Audit Trail) :</strong> Chaque flux génère une <strong>Transaction</strong> immuable pour garantir l'intégrité comptable du Grand Livre.</span>
                            </li>
                        </ul>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 4. KYC & LAB */}
                <article id="kyc" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><ShieldCheck className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">4. Lutte Anti-Blanchiment (KYC)</h2>
                    </div>
                    <p className="text-slate-600 text-sm mb-4">
                        L'accès aux services de paiement nécessite la validation d'un profil <strong>UserKYC</strong>. Les données collectées incluent :
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 text-xs font-medium">
                        <div className="p-4 border border-slate-100 rounded-xl bg-blue-50/30">Vérification de la validité des pièces d'identité nationales.</div>
                        <div className="p-4 border border-slate-100 rounded-xl bg-blue-50/30">Contrôle de conformité des RIB et numéros Mobile Money.</div>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 5. SIGNATURE ÉLECTRONIQUE */}
                <article id="signature" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><Fingerprint className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">5. Preuve de Signature</h2>
                    </div>
                    <p className="text-slate-600 text-sm mb-6">
                        Conformément à la réglementation ivoirienne, chaque contrat est protégé par un certificat <strong>SignatureProof</strong> collectant :
                    </p>
                    <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 grid gap-3 text-xs">
                        <div className="flex justify-between border-b border-purple-100 pb-2"><span>Horodatage (ISO 8601)</span> <span className="font-bold text-purple-700">Audit Log</span></div>
                        <div className="flex justify-between border-b border-purple-100 pb-2"><span>Validation SMS</span> <span className="font-bold text-purple-700">Code OTP unique</span></div>
                        <div className="flex justify-between"><span>Intégrité du document</span> <span className="font-bold text-purple-700">Hachage SHA-256</span></div>
                    </div>
                </article>

                <hr className="border-slate-100" />

                {/* 6. CONFORMITÉ LOI 2019 */}
                <article id="loi2019" className="scroll-mt-32">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600"><Gavel className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-black text-slate-900">6. Conformité Loi n° 2019-576</h2>
                    </div>
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-xl text-sm">
                        <p className="text-orange-900 leading-relaxed">
                            L'application <strong>Lease</strong> impose des limites strictes sur les dépôts de garantie (2 mois max) et loyers d'avance, bloquant techniquement toute saisie non conforme à la loi ivoirienne.
                        </p>
                    </div>
                </article>

            </div>
        </main>
      </div>

      {/* --- FOOTER --- */}
      <footer className="w-full bg-white border-t border-slate-200 py-16 print:hidden">
         <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-6 text-center">
            <Image 
                src="/logo2.png" 
                alt="WebappCi Logo" 
                width={100} 
                height={100} 
                className="opacity-80" 
            />
            <p className="text-xs font-medium text-slate-500">
                © {new Date().getFullYear()} WebappCi SARL - Solution ImmoFacile V5
            </p>
         </div>
      </footer>
      
    </div>
  );
}
