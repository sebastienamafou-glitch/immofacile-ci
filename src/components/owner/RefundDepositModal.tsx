"use client";

import { useState } from "react";
import { refundDepositAction } from "@/actions/lease.actions";
import { Coins, AlertCircle, CheckCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface RefundDepositModalProps {
  leaseId: string;
  tenantName: string;
  depositAmount: number;
  ownerId: string;
}

export default function RefundDepositModal({ leaseId, tenantName, depositAmount, ownerId }: RefundDepositModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deductions, setDeductions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const refundAmount = depositAmount - (deductions || 0);

  const handleRefund = async () => {
    if (deductions < 0 || deductions > depositAmount) {
      return alert("Le montant de la retenue est invalide.");
    }
    
    if (!confirm(`Confirmez-vous le transfert de ${refundAmount} FCFA vers le portefeuille de ${tenantName} ?`)) return;

    setIsLoading(true);
    const result = await refundDepositAction(leaseId, deductions, ownerId);
    setIsLoading(false);

    if (result?.success) {
      setIsSuccess(true);
      router.refresh();
    } else {
      // Best Practice : On vérifie que la propriété 'error' existe bien dans l'objet
      const errorMessage = result && 'error' in result ? result.error : "Inconnue";
      alert("Erreur lors de la restitution : " + errorMessage);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg flex items-center gap-3 font-medium border border-emerald-200">
        <CheckCircle className="w-5 h-5" />
        Caution restituée avec succès à {tenantName}.
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
      >
        <Coins className="w-4 h-4" />
        Restituer la caution
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Restitution de caution</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Locataire:</span>
                  <span className="font-bold text-slate-900">{tenantName}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Caution initiale déposée:</span>
                  <span className="font-bold text-slate-900">{depositAmount.toLocaleString()} FCFA</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Retenues pour dégradations (FCFA)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    max={depositAmount}
                    value={deductions || ""}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                    className="w-full pl-3 pr-12 py-3 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-medium"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">FCFA</span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> 
                  Laissez à 0 si le bien est rendu en parfait état.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-between items-end">
                <div className="text-sm text-slate-500 font-medium">Montant à restituer :</div>
                <div className="text-2xl font-black text-emerald-600">
                  {refundAmount > 0 ? refundAmount.toLocaleString() : 0} FCFA
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleRefund}
                disabled={isLoading || refundAmount < 0}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLoading ? "Transfert..." : "Transférer les fonds"}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
