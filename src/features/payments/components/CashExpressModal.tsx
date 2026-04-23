'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Banknote, Loader2 } from 'lucide-react';
import { processCashPayment } from '../actions/cashExpress';
import { generateRentReceipt } from '@/lib/pdf/receiptGenerator';

interface CashExpressProps {
  rentScheduleId: string;
  amountExpected: number;
  periodLabel: string; // ex: "Mars 2026"
}

export function CashExpressModal({ rentScheduleId, amountExpected, periodLabel }: CashExpressProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCashPayment = async () => {
    // Double confirmation (UX standard pour l'argent)
    if (!confirm(`Confirmez-vous avoir reçu ${amountExpected.toLocaleString()} FCFA en ESPÈCES pour le loyer de ${periodLabel} ?`)) {
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading("Enregistrement du paiement...");

    try {
      const response = await processCashPayment(rentScheduleId);

      if (response.success && response.data) {
        toast.success("Paiement enregistré ! Génération de la quittance...", { id: toastId });
        
        // Magie : On génère le PDF immédiatement après la validation en base
        generateRentReceipt({
          receiptNumber: response.data.receiptNumber,
          tenantName: response.data.tenantName,
          propertyName: response.data.propertyName,
          propertyAddress: response.data.propertyAddress,
          amount: response.data.amount,
          period: response.data.period,
          agencyName: response.data.agencyName,
          datePaid: response.data.datePaid
        });
      } else {
        toast.error(response.message, { id: toastId });
      }
    } catch (error) {
      toast.error("Une erreur technique est survenue.", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handleCashPayment} 
      disabled={isProcessing}
      className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
    >
      {isProcessing ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Banknote className="w-4 h-4 mr-2" />
      )}
      Encaisser Espèces
    </Button>
  );
}
