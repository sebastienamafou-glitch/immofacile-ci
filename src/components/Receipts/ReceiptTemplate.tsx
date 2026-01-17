import React from 'react';
import { ShieldCheck, QrCode, Building2, MapPin } from 'lucide-react';

interface ReceiptData {
  receiptId: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  tenant: {
    name: string;
    address: string;
    phone?: string;
  };
  owner: {
    name: string;
    address: string;
    email?: string;
  };
  property: {
    name: string;
    address: string;
    type?: string;
  };
  payment: {
    amount: number;
    charges: number;
    totalPaid: number;
    balanceDue: number; // S'il reste un impayé
    method: string;
    transactionId: string;
    paymentDate: string;
  };
  legalFooter: string;
}

export default function ReceiptTemplate({ data }: { data: ReceiptData }) {
  
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="w-[210mm] min-h-[297mm] mx-auto bg-white text-slate-900 font-sans relative overflow-hidden shadow-2xl print:shadow-none print:w-full">
      
      {/* --- 0. FILIGRANE DE SÉCURITÉ (BACKGROUND) --- */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="rotate-45 transform scale-150 whitespace-nowrap text-9xl font-black text-slate-900 select-none">
          IMMOFACILE ORIGINAL • CERTIFIÉ • PAYÉ • IMMOFACILE ORIGINAL • CERTIFIÉ • PAYÉ
        </div>
      </div>

      <div className="relative z-10 p-[15mm] h-full flex flex-col justify-between">
        
        {/* --- 1. EN-TÊTE PREMIUM --- */}
        <header className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center rounded-lg shadow-lg">
                    <Building2 className="w-10 h-10" />
                </div>
                <div>
                    <h1 className="text-3xl font-serif font-black tracking-wider uppercase text-slate-900">Quittance</h1>
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">De Loyer & Charges</p>
                </div>
            </div>

            <div className="text-right">
                <p className="font-mono text-sm text-slate-500 mb-1">RÉFÉRENCE UNIQUE</p>
                <p className="font-mono text-xl font-bold bg-slate-100 px-3 py-1 rounded inline-block border border-slate-300">
                    #{data.receiptId}
                </p>
                <p className="text-xs text-slate-500 mt-2">Date d'émission : {data.date}</p>
            </div>
        </header>

        {/* --- 2. INFORMATION PARTIES --- */}
        <section className="grid grid-cols-2 gap-8 mb-8">
            {/* BAILLEUR */}
            <div className="border-l-4 border-slate-900 pl-4 py-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bailleur / Propriétaire</p>
                <h3 className="font-bold text-lg text-slate-900">{data.owner.name}</h3>
                <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                    <p>{data.owner.address}</p>
                    {data.owner.email && <p className="text-xs">{data.owner.email}</p>}
                </div>
            </div>

            {/* LOCATAIRE */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-slate-200 px-3 py-1 rounded-bl-lg text-[10px] font-bold text-slate-600 uppercase">
                    Locataire
                </div>
                <h3 className="font-bold text-lg text-slate-900 mt-2">{data.tenant.name}</h3>
                <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                    <p>{data.tenant.address}</p>
                    {data.tenant.phone && <p>{data.tenant.phone}</p>}
                </div>
            </div>
        </section>

        {/* --- 3. DÉTAILS DU BIEN --- */}
        <section className="bg-slate-900 text-white p-4 rounded-lg mb-8 flex items-center gap-4 shadow-lg">
            <div className="p-2 bg-white/10 rounded-full">
                <MapPin className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Bien loué</p>
                <p className="font-medium text-sm">{data.property.name} - {data.property.address}</p>
            </div>
            <div className="text-right border-l border-white/20 pl-4">
                <p className="text-[10px] uppercase font-bold text-slate-400">Période du terme</p>
                <p className="font-mono text-sm font-bold">
                    {data.periodStart} <span className="text-slate-500">au</span> {data.periodEnd}
                </p>
            </div>
        </section>

        {/* --- 4. TABLEAU COMPTABLE --- */}
        <section className="mb-8">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-900 text-xs font-bold uppercase text-slate-500 text-left">
                        <th className="py-2 pl-2">Désignation</th>
                        <th className="py-2 text-right pr-2">Montant</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    <tr className="border-b border-slate-100">
                        <td className="py-4 pl-2 font-medium">Loyer mensuel nu</td>
                        <td className="py-4 pr-2 text-right font-mono text-slate-700">{formatMoney(data.payment.amount)}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                        <td className="py-4 pl-2 font-medium text-slate-600">Provisions sur charges</td>
                        <td className="py-4 pr-2 text-right font-mono text-slate-700">{formatMoney(data.payment.charges)}</td>
                    </tr>
                    {/* Ligne vide pour espacement */}
                    <tr><td className="py-2"></td></tr>
                    
                    {/* TOTAUX */}
                    <tr className="bg-orange-50/50">
                        <td className="py-3 pl-4 font-bold text-slate-900 uppercase text-xs">Total Facturé</td>
                        <td className="py-3 pr-4 text-right font-mono font-bold text-slate-900">{formatMoney(data.payment.amount + data.payment.charges)}</td>
                    </tr>
                    <tr>
                        <td className="py-3 pl-4 font-bold text-emerald-700 uppercase text-xs">Dont Payé le {data.payment.paymentDate}</td>
                        <td className="py-3 pr-4 text-right font-mono font-bold text-emerald-700">- {formatMoney(data.payment.totalPaid)}</td>
                    </tr>
                </tbody>
            </table>

            {/* RESTE À PAYER (si applicable) ou SOLDE NUL */}
            <div className="flex justify-end mt-4">
                <div className={`px-6 py-3 rounded-xl border-2 ${data.payment.balanceDue > 0 ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-900 bg-slate-900 text-white'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-center mb-1">
                        {data.payment.balanceDue > 0 ? 'Reste à Payer' : 'Net à Payer'}
                    </p>
                    <p className="text-2xl font-mono font-black text-center">
                        {formatMoney(data.payment.balanceDue)}
                    </p>
                </div>
            </div>
        </section>

        {/* --- 5. TAMPON & SIGNATURE --- */}
        <section className="flex justify-between items-end mb-12 relative">
            <div className="text-xs text-slate-500 w-1/2">
                <p className="font-bold text-slate-900 uppercase mb-1">Mode de règlement :</p>
                <p>{data.payment.method} - Réf: <span className="font-mono">{data.payment.transactionId}</span></p>
                <p className="mt-4 italic">
                    " Je soussigné, {data.owner.name}, propriétaire du logement désigné ci-dessus, déclare avoir reçu de M/Mme {data.tenant.name} la somme indiquée au titre du loyer et des charges. "
                </p>
            </div>

            {/* TAMPON ESTHÉTIQUE */}
            <div className="relative group">
                 <div className="w-40 h-40 border-4 border-double border-blue-900 rounded-full flex flex-col items-center justify-center text-blue-900 opacity-80 transform -rotate-12 mask-image-grunge">
                    <div className="absolute inset-2 border border-blue-900 rounded-full"></div>
                    <ShieldCheck className="w-8 h-8 mb-1" />
                    <p className="text-lg font-black uppercase tracking-wider">PAYÉ</p>
                    <p className="text-[8px] font-bold text-center uppercase">Certifié conforme<br/>ImmoFacile CI</p>
                    <p className="text-[9px] font-mono mt-1 font-bold">{data.payment.paymentDate}</p>
                 </div>
                 {/* Signature Simulée */}
                 <div className="absolute bottom-4 left-0 right-0 text-center font-cursive text-xl text-blue-800 opacity-70 rotate-6 transform translate-y-2">
                    Signature Numérique
                 </div>
            </div>
        </section>

        {/* --- 6. FOOTER DE SÉCURITÉ --- */}
        <footer className="mt-auto pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Simulation QR Code */}
                    <div className="bg-white p-1 border border-slate-200 rounded">
                        <QrCode className="w-12 h-12 text-slate-900" />
                    </div>
                    <div className="text-[8px] text-slate-500 leading-tight">
                        <p className="font-bold text-slate-900 mb-0.5">VÉRIFICATION D'AUTHENTICITÉ</p>
                        <p>Scannez ce code pour vérifier la validité</p>
                        <p>de ce document sur immofacile.ci/verify</p>
                        <p className="font-mono mt-0.5 select-all">ID: {data.receiptId}</p>
                    </div>
                </div>

                <div className="text-right text-[8px] text-slate-400 max-w-xs">
                    <p>{data.legalFooter}</p>
                    <p className="mt-1">Généré par la plateforme ImmoFacile • {new Date().getFullYear()}</p>
                </div>
            </div>
            
            {/* Code Barres Décoratif */}
            <div className="w-full h-3 mt-4 opacity-30 bg-[url('https://upload.wikimedia.org/wikipedia/commons/5/5d/UPC-A-036000291452.svg')] bg-repeat-x bg-contain"></div>
        </footer>
      </div>
    </div>
  );
}
