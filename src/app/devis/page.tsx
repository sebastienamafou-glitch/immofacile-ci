'use client';

import React, { useRef } from 'react';
import { Printer, Share2, Download, Phone, MapPin, Globe } from 'lucide-react';

// --- DONNÉES DU DEVIS (À connecter plus tard à votre Base de Données) ---
const QUOTE_DATA = {
  id: "WA-2026-001",
  date: "09 Février 2026",
  validity: "30 jours",
  issuer: {
    name: "WEBAPPCI SARL",
    address: "Abidjan, Cocody",
    phone: "+33 7 83 97 41 75",
    email: "contact@webappci.com",
    website: "www.webappci.com",
    logoText: "WA" // Ou une image
  },
  client: {
    company: "",
    contact: "À l'attention du Directeur Général",
    address: "Abidjan, Côte d'Ivoire",
  },
  items: [
    {
      title: "PHASE 1 : DESIGN & UX (L'Image de Marque)",
      description: "Conception graphique Premium, Maquettage, Approche Mobile First.",
      qty: 1,
      price: 250000
    },
    {
      title: "PHASE 2 : DÉVELOPPEMENT TECHNIQUE",
      description: "Intégration Next.js, Optimisation connexion lente (3G/4G), Catalogue dynamique.",
      qty: 1,
      price: 600000
    },
    {
      title: "PHASE 3 : FONCTIONNALITÉS MÉTIER",
      description: "Bouton WhatsApp, Formulaire Devis, Google Maps, Sécurité SSL.",
      qty: 1,
      price: 200000
    },
    {
      title: "PHASE 4 : DÉPLOIEMENT & FORMATION",
      description: "Nom de domaine .ci, Hébergement Cloud, Formation administration (2h).",
      qty: 1,
      price: 150000
    }
  ],
  discount: 120000, // Remise Partenaire
  maintenance: {
    enabled: true,
    price: 250000,
    label: "OPTION : Maintenance Annuelle & Sécurité"
  }
};

export default function QuotePage() {
  
  // Fonction pour imprimer / générer le PDF
  const handlePrint = () => {
    window.print();
  };

  // Calculs
  const subTotal = QUOTE_DATA.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const totalNet = subTotal - QUOTE_DATA.discount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount).replace('XOF', 'FCFA');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 print:py-0 print:bg-white text-slate-800 font-sans">
      
      {/* --- BARRE D'ACTIONS (Invisible à l'impression) --- */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden px-4">
        <h1 className="text-2xl font-bold text-gray-800">Aperçu du Devis</h1>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition shadow-sm">
            <Printer size={18} />
            Imprimer / PDF
          </button>
          <button className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition shadow-sm">
            <Share2 size={18} />
            Envoyer
          </button>
        </div>
      </div>

      {/* --- FEUILLE A4 --- */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:w-full print:max-w-none p-10 md:p-12 rounded-lg">
        
        {/* EN-TÊTE */}
        <header className="flex justify-between items-start border-b-2 border-orange-500 pb-8 mb-8">
          <div>
            {/* LOGO SIMULÉ */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                {QUOTE_DATA.issuer.logoText}
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900">WEBAPPCI</span>
            </div>
            <div className="text-sm text-slate-500 space-y-1">
              <p className="flex items-center gap-2"><MapPin size={14}/> {QUOTE_DATA.issuer.address}</p>
              <p className="flex items-center gap-2"><Phone size={14}/> {QUOTE_DATA.issuer.phone}</p>
              <p className="flex items-center gap-2"><Globe size={14}/> {QUOTE_DATA.issuer.website}</p>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-4xl font-light text-slate-300 mb-2">DEVIS</h2>
            <p className="text-lg font-bold text-slate-800">#{QUOTE_DATA.id}</p>
            <p className="text-sm text-slate-500 mt-1">Date : {QUOTE_DATA.date}</p>
            <p className="text-sm text-orange-600 font-medium mt-1">Validité : {QUOTE_DATA.validity}</p>
          </div>
        </header>

        {/* INFO CLIENT */}
        <section className="flex justify-between mb-12">
          <div className="w-1/2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Émetteur</h3>
            <p className="font-bold text-slate-800">{QUOTE_DATA.issuer.name}</p>
            <p className="text-sm text-slate-600">Architecte Système & Digital</p>
          </div>
          <div className="w-1/2 text-right">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Client</h3>
            <p className="font-bold text-xl text-slate-900">{QUOTE_DATA.client.company}</p>
            <p className="text-sm text-slate-600">{QUOTE_DATA.client.contact}</p>
            <p className="text-sm text-slate-600">{QUOTE_DATA.client.address}</p>
          </div>
        </section>

        {/* TABLEAU DES PRESTATIONS */}
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-2 text-sm font-bold text-slate-600 uppercase w-1/2">Désignation</th>
              <th className="text-center py-3 px-2 text-sm font-bold text-slate-600 uppercase">Qté</th>
              <th className="text-right py-3 px-2 text-sm font-bold text-slate-600 uppercase">P.U. (FCFA)</th>
              <th className="text-right py-3 px-2 text-sm font-bold text-slate-600 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {QUOTE_DATA.items.map((item, index) => (
              <tr key={index} className="border-b border-slate-100 group">
                <td className="py-4 px-2">
                  <p className="font-bold text-slate-800">{item.title}</p>
                  <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                </td>
                <td className="py-4 px-2 text-center text-slate-600">{item.qty}</td>
                <td className="py-4 px-2 text-right text-slate-600">{formatCurrency(item.price)}</td>
                <td className="py-4 px-2 text-right font-medium text-slate-800">{formatCurrency(item.price * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTAUX */}
        <div className="flex justify-end mb-12">
          <div className="w-2/3 md:w-1/2 space-y-3">
            <div className="flex justify-between text-slate-600">
              <span>Total Services (HT)</span>
              <span>{formatCurrency(subTotal)}</span>
            </div>
            
            {QUOTE_DATA.discount > 0 && (
              <div className="flex justify-between text-green-600 font-medium bg-green-50 p-2 rounded">
                <span>Remise Commerciale (Lancement)</span>
                <span>- {formatCurrency(QUOTE_DATA.discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-xl font-bold text-slate-900 border-t-2 border-slate-800 pt-3 mt-3">
              <span>NET À PAYER</span>
              <span>{formatCurrency(totalNet)}</span>
            </div>
            <p className="text-xs text-right text-slate-400 italic">TVA non applicable (Art. 261 CGI)</p>
          </div>
        </div>

        {/* OPTION MAINTENANCE */}
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-6 mb-8 print:border-slate-200 print:bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-orange-800 print:text-slate-800">Option Recommandée : Maintenance & Sécurité</h4>
              <p className="text-sm text-orange-700 mt-1 print:text-slate-600">Hébergement Cloud, Sauvegardes, Mises à jour sécurité.</p>
            </div>
            <div className="text-right">
                <span className="block font-bold text-lg text-orange-900 print:text-slate-900">{formatCurrency(QUOTE_DATA.maintenance.price)} / an</span>
            </div>
          </div>
        </div>

        {/* PIED DE PAGE & SIGNATURE */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-slate-200 break-inside-avoid">
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-500 mb-3">Conditions de Règlement</h4>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• 40% à la commande (Démarrage)</li>
              <li>• 30% à la validation maquette</li>
              <li>• 30% à la livraison finale</li>
              <li className="pt-2 font-bold text-slate-800">Moyens acceptés :</li>
              <li>Virement, Chèque, Wave / Orange Money</li>
            </ul>
          </div>
          <div className="text-center border-l-2 border-slate-100">
            <h4 className="font-bold text-xs uppercase text-slate-500 mb-8">Bon pour Accord (Date & Signature)</h4>
            <div className="h-24 w-full border-2 border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 text-sm">
              Cachet & Signature Client
            </div>
          </div>
        </div>

        <footer className="mt-16 text-center text-[10px] text-slate-400">
            <p>WEBAPPCI SARL - Abidjan Cocody - Tél : +33 7 83 97 41 75</p>
            <p>Ce devis est valable 30 jours. Merci de votre confiance.</p>
        </footer>

      </div>
    </div>
  );
}
