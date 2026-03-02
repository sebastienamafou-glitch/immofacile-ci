import React from "react";
import ClientQRCode from "@/components/shared/ClientQRCode";
import { ShieldCheck, Printer, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReceiptProps {
  payment: {
    id: string;
    amount: number;
    createdAt: string;
    reference: string;
    method: string;
    type: string;
    lease: {
      monthlyRent: number;
      property: { title: string; address: string };
      tenant: { name: string };
    };
  };
}

export default function RentReceipt({ payment }: ReceiptProps) {
  // 1. CALCULS FINANCIERS
  const baseRent = payment.lease.monthlyRent;
  const isLate = new Date(payment.createdAt).getDate() > 10;
  const penalty = isLate ? Math.floor(baseRent * 0.10) : 0;
  const netAmount = payment.amount - penalty;

  return (
    <div className="bg-[#0B1120] p-4 md:p-8 rounded-3xl border border-slate-800 max-w-2xl mx-auto shadow-2xl">
      {/* BOUTON IMPRESSION (HORS ZONE IMPRIMABLE) */}
      <div className="flex justify-end mb-6 print:hidden">
        <Button 
          onClick={() => window.print()}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
        >
          <Printer className="w-4 h-4 mr-2" /> Télécharger / Imprimer
        </Button>
      </div>

      {/* --- DOCUMENT DE QUITTANCE --- */}
      <div className="bg-white text-slate-900 p-8 rounded-sm shadow-inner print:shadow-none font-serif relative overflow-hidden">
        {/* Filigrane de sécurité */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-35deg] pointer-events-none">
          <ShieldCheck className="w-96 h-96" />
        </div>

        {/* HEADER QUITTANCE */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8 relative z-10">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Quittance de Loyer</h1>
            <p className="text-[10px] text-slate-500 font-sans uppercase font-bold">Certificat de Paiement Babimmo</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-mono text-slate-400">Réf: {payment.reference.toUpperCase()}</p>
            <p className="text-xs font-bold">Le {new Date(payment.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        {/* CONTENU */}
        <div className="space-y-6 text-sm relative z-10">
          <p>
            Je soussigné, mandataire de la plateforme <strong>Babimmo.ci</strong>, certifie avoir reçu de la part de :
            <br />
            <strong className="text-base uppercase underline">{payment.lease.tenant.name}</strong>
          </p>

          <p>
            La somme totale de : <strong className="text-lg italic">{payment.amount.toLocaleString()} FCFA</strong>
            <br />
            <span className="text-xs text-slate-500 italic">Pour le loyer du bien : {payment.lease.property.title}</span>
          </p>

          {/* DÉTAILS FINANCIERS */}
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-2 font-sans">
            <div className="flex justify-between text-xs">
              <span>Loyer principal (Net) :</span>
              <span className="font-bold">{netAmount.toLocaleString()} FCFA</span>
            </div>
            {isLate && (
              <div className="flex justify-between text-xs text-red-600 font-bold">
                <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Pénalité de retard (10%) :</span>
                <span>+ {penalty.toLocaleString()} FCFA</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-300 pt-2 font-black text-sm">
              <span>TOTAL ACQUITTÉ :</span>
              <span className="text-emerald-600">{payment.amount.toLocaleString()} FCFA</span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed italic text-slate-600">
            Cette quittance est délivrée sous réserve de tout encaissement définitif. Elle annule tous les reçus provisoires qui auraient pu être remis précédemment pour la même période.
          </p>
        </div>

        {/* FOOTER & QR CODE */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-end relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase">
              <CheckCircle2 className="w-4 h-4"/> Paiement Sécurisé {payment.method}
            </div>
            <p className="text-[8px] font-mono text-slate-400">Auth ID: {payment.id.split('-')[0].toUpperCase()}</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="border border-slate-200 p-1">
              <ClientQRCode value={`https://babimmo.ci/receipt/${payment.id}`} size={60} level="H" />
            </div>
            <span className="text-[7px] font-bold text-slate-400 mt-1 uppercase">Vérifier l'audit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
