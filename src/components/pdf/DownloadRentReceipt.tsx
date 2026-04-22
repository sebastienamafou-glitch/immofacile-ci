"use client";

import { useEffect, useState } from "react";
import { PDFDownloadLink } from '@react-pdf/renderer';
import { RentReceiptPDF } from './RentReceiptPDF';
import { Download, Loader2 } from 'lucide-react';

export default function DownloadRentReceipt({ payment, lease, tenant, property, owner }: any) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  if (!isClient) return null;

  const receiptData = {
    id: payment.id,
    date: new Date(payment.date).toLocaleDateString('fr-FR'),
    period: new Date(payment.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    tenantName: tenant?.name || "Locataire",
    propertyAddress: property?.title || "Adresse inconnue",
    ownerName: owner?.name || "Propriétaire",
    amount: payment.amount,
    reference: `QUIT-${payment.id.substring(0, 6).toUpperCase()}`,
    // ✅ AJOUTS FISCAUX CRUCIAUX ICI
    type: payment.type,
    depositAmount: lease?.depositAmount || 0,
    advanceAmount: lease?.advanceAmount || 0,
    feesAmount: lease?.tenantLeasingFee || 0,
  };

  return (
    <PDFDownloadLink
      document={<RentReceiptPDF data={receiptData} />}
      fileName={`Quittance_${receiptData.reference}.pdf`}
    >
      {/* @ts-ignore */}
      {({ loading }: any) => (
        <button 
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold transition"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-orange-500" />}
          {loading ? "..." : "QUITTANCE"}
        </button>
      )}
    </PDFDownloadLink>
  );
}
