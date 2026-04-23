"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processCashPaymentAction } from "@/app/dashboard/agency/wallet/actions";
import { generateRentReceiptPDF } from "@/lib/pdfGenerator";

interface CashExpressButtonProps {
  scheduleId: string;
  amount: number;
  expectedDate: Date;
}

export default function CashExpressButton({ scheduleId, amount, expectedDate }: CashExpressButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    const period = new Date(expectedDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    
    if (!confirm(`Confirmez-vous avoir reçu ${amount.toLocaleString()} FCFA en ESPÈCES de la part du locataire pour la période de ${period} ?`)) {
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading("Enregistrement du paiement comptable...");

    try {
      const res = await processCashPaymentAction(scheduleId);
      
      if (res.success && res.data) {
        toast.success("Paiement validé ! Génération de la quittance en cours...", { id: toastId });
        generateRentReceiptPDF(res.data);
      } else {
        toast.error(res.message || "Erreur technique", { id: toastId });
      }
    } catch (error) {
      toast.error("Erreur de connexion au serveur.", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handlePayment}
      disabled={isProcessing}
      variant="default"
      className="flex-1 md:flex-none font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-transform active:scale-95 border-emerald-500"
    >
      {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Banknote className="w-4 h-4 mr-2" />}
      {isProcessing ? "Validation..." : "Encaisser Cash"}
    </Button>
  );
}
