import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface ReceiptData {
  receiptId: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  tenant: {
    name: string;
    address: string;
  };
  owner: {
    name: string;
    address: string;
  };
  property: {
    name: string;
    address: string;
  };
  payment: {
    amount: number;
    charges: number;
    method: string;
    transactionId: string;
  };
  legalFooter: string;
  techProvider: string;
}

export default function ReceiptTemplate({ data }: { data: ReceiptData }) {
  
  // Formatage monétaire
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  const totalAmount = data.payment.amount + data.payment.charges;

  return (
    <div className="w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] shadow-2xl print:shadow-none print:w-full print:m-0 text-slate-900 font-sans relative overflow-hidden">
      
      {/* 1. EN-TÊTE */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Quittance de Loyer</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">N° {data.receiptId}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">IMMOFACILE</p>
          <p className="text-xs text-slate-500">Plateforme de Gestion Agréée</p>
          <p className="text-sm font-mono mt-2 bg-slate-100 px-2 py-1 rounded inline-block">
            Date : {data.date}
          </p>
        </div>
      </div>

      {/* 2. PARTIES */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Bailleur (Propriétaire)</p>
          <p className="font-bold text-lg leading-tight">{data.owner.name}</p>
          <p className="text-sm text-slate-600 mt-1">{data.owner.address}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 relative">
            <div className="absolute top-0 right-0 bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg">LOCATAIRE</div>
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Locataire</p>
          <p className="font-bold text-lg leading-tight">{data.tenant.name}</p>
          <p className="text-sm text-slate-600 mt-1">{data.tenant.address}</p>
        </div>
      </div>

      {/* 3. OBJET & PÉRIODE */}
      <div className="mb-8">
        <p className="text-sm mb-4">
            <span className="font-bold">Objet :</span> Quittance de loyer pour le bien situé à :
        </p>
        <div className="pl-4 border-l-4 border-orange-500 mb-6">
            <p className="font-bold text-lg">{data.property.name}</p>
            <p className="text-slate-600">{data.property.address}</p>
        </div>
        <p className="text-sm">
            <span className="font-bold">Période concernée :</span> Du <strong>{data.periodStart}</strong> au <strong>{data.periodEnd}</strong>.
        </p>
      </div>

      {/* 4. DÉTAIL FINANCIER */}
      <div className="mb-12">
        <table className="w-full border-collapse">
            <thead>
                <tr className="bg-slate-900 text-white text-sm uppercase">
                    <th className="py-3 px-4 text-left rounded-tl-lg">Désignation</th>
                    <th className="py-3 px-4 text-right rounded-tr-lg">Montant</th>
                </tr>
            </thead>
            <tbody className="text-sm">
                <tr className="border-b border-slate-200">
                    <td className="py-4 px-4 font-medium">Loyer Principal</td>
                    <td className="py-4 px-4 text-right font-mono">{formatMoney(data.payment.amount)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                    <td className="py-4 px-4 font-medium text-slate-600">Provisions sur charges</td>
                    <td className="py-4 px-4 text-right font-mono text-slate-600">{formatMoney(data.payment.charges)}</td>
                </tr>
                <tr className="bg-orange-50 font-bold text-lg">
                    <td className="py-4 px-4 text-orange-900 rounded-bl-lg">TOTAL PAYÉ</td>
                    <td className="py-4 px-4 text-right font-mono text-orange-900 rounded-br-lg">{formatMoney(totalAmount)}</td>
                </tr>
            </tbody>
        </table>
        
        <div className="mt-4 flex justify-between items-center text-xs text-slate-500">
            <p>Mode de règlement : <span className="font-bold text-slate-900 uppercase">{data.payment.method}</span></p>
            <p>Ref Transaction : <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{data.payment.transactionId || 'N/A'}</span></p>
        </div>
      </div>

      {/* 5. TAMPON NUMÉRIQUE */}
      <div className="flex justify-end mb-12">
        <div className="relative border-4 border-blue-900 text-blue-900 w-48 h-32 flex flex-col items-center justify-center p-2 transform -rotate-6 opacity-90 rounded-lg">
            <div className="absolute inset-0 border border-blue-900/30 m-1 rounded"></div>
            <ShieldCheck className="w-8 h-8 mb-1" />
            <p className="text-xl font-black uppercase">PAYÉ</p>
            <p className="text-[10px] font-bold text-center leading-tight mt-1">
                CERTIFIÉ PAR<br/>IMMOFACILE CI
            </p>
            <p className="text-[9px] font-mono mt-1">{data.date}</p>
        </div>
      </div>

      {/* 6. PIED DE PAGE LÉGAL */}
      <div className="absolute bottom-0 left-0 w-full p-[20mm] text-center">
        <p className="text-[9px] text-slate-500 leading-relaxed max-w-2xl mx-auto mb-2">
            {data.legalFooter}
        </p>
        <p className="text-[8px] text-slate-400 font-mono uppercase tracking-widest">
            {data.techProvider} • Document généré électroniquement • Valeur Juridique Probante
        </p>
      </div>

    </div>
  );
}
