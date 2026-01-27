"use client";

import { History, Receipt, Download, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
// ✅ IMPORT DU TYPE SSOT
import { TenantPaymentData } from "@/lib/types/tenant";

export default function PaymentHistory({ payments }: { payments: TenantPaymentData[] }) {
  
  const handleDownloadReceipt = (id: string) => {
      // Placeholder: À connecter à votre générateur PDF plus tard
      toast.info("Téléchargement du reçu...");
  };

  return (
    <Card className="bg-[#0F172A] border-white/5 rounded-[2.5rem] shadow-xl overflow-hidden min-h-[400px]">
        <CardHeader className="flex flex-row items-center justify-between mx-6 px-0 pb-6 border-b border-white/5">
            <CardTitle className="text-lg font-black text-white italic">Historique</CardTitle>
            <History className="w-5 h-5 text-slate-600" />
        </CardHeader>
        <CardContent className="p-0">
            <div className="divide-y divide-white/5">
                {payments && payments.length > 0 ? (
                    payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between px-8 py-5 transition-all group hover:bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className={`flex items-center justify-center border w-10 h-10 rounded-xl ${
                                    payment.status === 'SUCCESS' 
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' 
                                    : 'bg-slate-800 text-slate-500 border-slate-700'
                                }`}>
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white uppercase italic">
                                        {new Date(payment.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                            {payment.type === 'DEPOSIT' ? 'Caution' : 'Loyer'}
                                        </p>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            - {payment.amount.toLocaleString()} F
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {payment.status === 'SUCCESS' && (
                                <button 
                                    onClick={() => handleDownloadReceipt(payment.id)} 
                                    className="p-2 text-slate-500 transition-all rounded-lg bg-white/5 hover:text-orange-500 active:scale-95"
                                    title="Télécharger Reçu"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center px-6 flex flex-col items-center">
                        <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-3">
                            <AlertCircle className="w-5 h-5 text-slate-700" />
                        </div>
                        <p className="text-sm font-bold italic text-slate-600">Aucune archive disponible</p>
                        <p className="text-[10px] text-slate-700 mt-1">Vos paiements apparaîtront ici.</p>
                    </div>
                )}
            </div>
        </CardContent>
    </Card>
  );
}
