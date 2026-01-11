"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, ArrowLeft, Printer, Download } from "lucide-react";
import ReceiptTemplate from "@/components/Receipts/ReceiptTemplate";

export default function ReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<any>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        // On récupère le paiement avec toutes les relations (Bail -> Bien -> Propriétaire)
        const res = await api.get(`/payment/${id}`);
        if (res.data.success || res.data) {
           setPayment(res.data.payment || res.data);
        }
      } catch (error) {
        console.error("Erreur chargement quittance", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchReceipt();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="animate-spin text-[#F59E0B] w-10 h-10" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Génération du document...</p>
    </div>
  );

  if (!payment) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white">
        <p className="mb-4 text-slate-400">Quittance introuvable ou accès refusé.</p>
        <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm transition"
        >
            Retour
        </button>
    </div>
  );

  // --- PRÉPARATION DES DONNÉES (Adapté au contexte WebappCi) ---
  const receiptData = {
    receiptId: payment.id?.substring(0, 12).toUpperCase() || "N/A",
    date: new Date(payment.createdAt || Date.now()).toLocaleDateString('fr-FR'),
    
    // Période (Mois du loyer)
    periodStart: `01 ${payment.month || 'du mois'}`, 
    periodEnd: `Fin ${payment.month || 'du mois'}`,
    
    // 1. LE LOCATAIRE (Celui qui paie)
    tenant: {
      name: payment.lease?.tenant?.name || "Locataire",
      address: payment.lease?.tenant?.address || "Adresse renseignée au bail"
    },

    // 2. LE PROPRIÉTAIRE (Le vrai bailleur, pas l'agence)
    owner: {
      name: payment.lease?.property?.owner?.name || "Propriétaire (Client ImmoFacile)", 
      address: payment.lease?.property?.owner?.address || "Adresse postale du propriétaire"
    },

    // 3. LE BIEN LOUÉ
    property: {
      name: payment.lease?.property?.title || "Bien Immobilier",
      address: payment.lease?.property?.address || payment.lease?.property?.commune || "Abidjan, CI"
    },

    // 4. LES CHIFFRES
    payment: {
      amount: payment.amount || 0,
      charges: payment.charges || 0,
      method: payment.provider || "Mobile Money / Carte", // Ex: WAVE, OM
      transactionId: payment.transactionId
    },

    // 5. MENTIONS LÉGALES (WebappCi)
    legalFooter: "Ce document est une quittance de loyer générée automatiquement par la plateforme ImmoFacile. Elle atteste du paiement reçu par le propriétaire via nos services de cantonnement sécurisé.",
    techProvider: "Solution éditée et exploitée par WebappCi SARL."
  };

  return (
    <div className="min-h-screen bg-[#0B1120] py-8 print:bg-white print:py-0">
      
      {/* BARRE D'OUTILS (Invisible à l'impression) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center px-4 print:hidden">
        <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm transition"
        >
            <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#F59E0B] hover:bg-orange-500 text-slate-900 font-bold px-4 py-2 rounded-lg transition shadow-lg shadow-orange-500/20"
        >
            <Printer className="w-4 h-4" /> Imprimer / PDF
        </button>
      </div>

      {/* RENDU DU DOCUMENT */}
      {/* On passe les nouvelles données textuelles au template */}
      <ReceiptTemplate data={receiptData} />
      
      {/* Note discrète écran uniquement */}
      <p className="text-center text-[10px] text-slate-600 mt-8 print:hidden">
        Propulsé par WebappCi &bull; ImmoFacile 
      </p>

    </div>
  );
} //
