'use client';

import React from 'react';
import Image from 'next/image';
import { Printer, ShieldCheck, Zap, Lock, CreditCard, MapPin, Phone, Globe } from 'lucide-react';

export default function PlaquettePage() {
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-slate-900 font-sans">
      
      {/* BARRE D'ACTIONS - CACHÉE À L'IMPRESSION */}
      <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center print:hidden px-4">
        <h1 className="text-lg font-bold">Plaquette Commerciale WebappCi</h1>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2 rounded-full hover:bg-orange-700 transition shadow-md text-sm font-bold">
          <Printer size={16} />
          Imprimer (A4)
        </button>
      </div>

      {/* FEUILLE A4 - OPTIMISÉE POUR UNE PAGE UNIQUE */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none p-8 md:p-10 border-t-[10px] border-orange-600 print:w-full">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <Image 
                src="/logo2.png" 
                alt="Logo WebappCi" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter leading-none">WEBAPPCI</h1>
              <p className="text-orange-600 font-bold tracking-[0.2em] uppercase text-[10px] mt-1">L'Excellence du Code</p>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-400 leading-relaxed uppercase tracking-wider">
            <p className="flex items-center justify-end gap-1"><MapPin size={10}/> Abidjan, Côte d'Ivoire</p>
            <p className="flex items-center justify-end gap-1"><Globe size={10}/> www.webappci.com</p>
          </div>
        </div>

        {/* HERO SECTION */}
        <section className="mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 leading-tight mb-4">
            Bâtir des infrastructures <br/>
            <span className="text-orange-600">numériques souveraines</span>.
          </h2>
          <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
            Nous développons des écosystèmes SaaS et Fintech capables de sécuriser vos opérations 
            et de garantir votre conformité réglementaire automatiquement.
          </p>
        </section>

        {/* ARGUMENTS TECHNIQUES */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-10">
          
          <div className="flex gap-4">
            <div className="shrink-0 w-10 h-10 bg-orange-50 text-orange-600 rounded flex items-center justify-center">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 mb-1">Verrouillage Algorithmique</h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Contraintes strictes ("Hard Constraints") rendant toute erreur juridique techniquement impossible.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 w-10 h-10 bg-orange-50 text-orange-600 rounded flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 mb-1">Sécurité Fintech Native</h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Intégration Mobile Money avec protocoles d'idempotence pour éviter les doubles débits.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 w-10 h-10 bg-orange-50 text-orange-600 rounded flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 mb-1">Preuve Numérique</h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Actes scellés par empreinte cryptographique SHA-256 avec valeur probante.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 w-10 h-10 bg-orange-50 text-orange-600 rounded flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 mb-1">Performance Cloud</h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Architecture Next.js optimisée pour un affichage instantané sur les réseaux 3G/4G locaux.
              </p>
            </div>
          </div>

        </div>

        {/* L'EXEMPLE IMMOFACILE */}
        <div className="bg-slate-900 text-white rounded-xl p-6 mb-10 flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10 w-3/4">
            <h4 className="text-orange-500 font-bold uppercase text-[9px] tracking-widest mb-1">Référence Majeure</h4>
            <h3 className="text-xl font-bold mb-2">Projet IMMOFACILE</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Infrastructure garantissant par le code le respect de la Loi n° 2019-576. 
              Un modèle de Tiers de Confiance Numérique souverain en zone UEMOA.
            </p>
          </div>
          <div className="text-5xl font-black text-slate-800 absolute right-[-5px] bottom-[-5px] rotate-[-5deg] select-none opacity-40">
            WA-CI
          </div>
        </div>

        {/* FOOTER / CONTACT */}
        <footer className="border-t border-slate-100 pt-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              <Image src="/logo2.png" alt="Logo WebappCi" fill className="object-contain" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Direction Technique</p>
              <p className="text-base font-bold text-slate-900">AMAFOU MEL SEBASTIEN</p>
              <p className="text-xs text-slate-500">Architecte Système & Fondateur </p>
            </div>
          </div>
          <div className="text-right space-y-0.5 text-xs font-medium">
            <p className="text-orange-600 flex items-center justify-end gap-1"><Phone size={12}/> +33 07 83 97 41 75</p>
            <p className="text-slate-800">contact@webappci.com</p>
            <p className="text-slate-400 text-[10px] italic">https://www.immofacile.ci</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
