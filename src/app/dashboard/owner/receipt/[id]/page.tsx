"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, ArrowLeft, Printer } from "lucide-react";
import ReceiptTemplate from "@/components/Receipts/ReceiptTemplate";

export default function ReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<any>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const res = await api.get(`/payment/${id}`);
        // Gestion robuste de la réponse API
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

  // --- PRÉPARATION DES DONNÉES (CORRIGÉE POUR LE TYPE STRICT) ---
  const receiptData = {
    receiptId: payment.id?.substring(0, 12).toUpperCase() || "N/A",
    date: new Date(payment.createdAt || Date.now()).toLocaleDateString('fr-FR'),
    
    periodStart: `01 ${payment.month || 'du mois'}`, 
    periodEnd: `Fin ${payment.month || 'du mois'}`,
    
    tenant: {
      name: payment.lease?.tenant?.name || "Locataire",
      address: payment.lease?.tenant?.address || "Adresse renseignée au bail"
    },

    owner: {
      name: payment.lease?.property?.owner?.name || "Propriétaire (Client ImmoFacile)", 
      address: payment.lease?.property?.owner?.address || "Adresse postale du propriétaire"
    },

    property: {
      name: payment.lease?.property?.title || "Bien Immobilier",
      address: payment.lease?.property?.address || payment.lease?.property?.commune || "Abidjan, CI"
    },

    // ✅ CORRECTION ICI : Ajout des champs manquants (totalPaid, balanceDue, paymentDate)
    payment: {
      amount: payment.amount || 0,
      charges: payment.charges || 0,
      totalPaid: (payment.amount || 0) + (payment.charges || 0), // Calcul simple
      balanceDue: 0, // Pour une quittance, on considère que c'est payé
      method: payment.provider || "Mobile Money / Carte",
      transactionId: payment.transactionId || "N/A",
      paymentDate: new Date(payment.createdAt || Date.now()).toLocaleDateString('fr-FR')
    },

    legalFooter: "Ce document est une quittance de loyer générée automatiquement par la plateforme ImmoFacile. Elle atteste du paiement reçu par le propriétaire via nos services de cantonnement sécurisé."
    // Note : J'ai retiré 'techProvider' car il n'est pas dans l'interface stricte du Template
  };

  return (
    <div className="min-h-screen bg-[#0B1120] py-8 print:bg-white print:py-0">
      
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

      <ReceiptTemplate data={receiptData} />
      
      <p className="text-center text-[10px] text-slate-600 mt-8 print:hidden">
        Propulsé par WebappCi &bull; ImmoFacile 
      </p>

    </div>
  );
}
