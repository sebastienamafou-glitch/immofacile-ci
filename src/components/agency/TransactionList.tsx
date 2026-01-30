"use client";

import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Interface flexible pour accepter les données de l'API ou des Props
interface TransactionItem {
  id: string;
  type: string; // "CREDIT" | "DEBIT"
  amount: number;
  reason: string;
  status: string; // "PENDING" | "SUCCESS" | "FAILED"
  createdAt: string | Date;
}

interface TransactionListProps {
  transactions: TransactionItem[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  
  if (transactions.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            <Clock className="w-10 h-10 mb-3 opacity-50" />
            <p className="font-medium">Aucune transaction enregistrée.</p>
            <p className="text-xs mt-1">L'historique financier de l'agence apparaîtra ici.</p>
        </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 shadow-xl bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 font-bold">Mouvement</th>
              <th className="px-6 py-4 font-bold">Libellé / Motif</th>
              <th className="px-6 py-4 font-bold">Date</th>
              <th className="px-6 py-4 font-bold text-right">Montant</th>
              <th className="px-6 py-4 font-bold text-center">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {transactions.map((tx) => {
              const isCredit = tx.type === "CREDIT";
              const dateObj = new Date(tx.createdAt);

              return (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition duration-150 group">
                  
                  {/* TYPE */}
                  <td className="px-6 py-4">
                     {isCredit ? (
                         <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            <ArrowDownLeft size={12} className="mr-1.5" /> ENTRÉE
                         </span>
                     ) : (
                         <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <ArrowUpRight size={12} className="mr-1.5" /> SORTIE
                         </span>
                     )}
                  </td>

                  {/* MOTIF */}
                  <td className="px-6 py-4">
                    <span className="text-slate-200 font-medium block truncate max-w-[200px]" title={tx.reason}>
                        {tx.reason}
                    </span>
                  </td>

                  {/* DATE */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-slate-300 font-medium">
                            {dateObj.toLocaleDateString("fr-FR", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                            {dateObj.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                  </td>

                  {/* MONTANT */}
                  <td className="px-6 py-4 text-right">
                     <span className={`font-mono font-bold text-base ${isCredit ? "text-emerald-400" : "text-white"}`}>
                        {isCredit ? "+" : "-"}{tx.amount.toLocaleString()} <span className="text-xs text-slate-600 font-normal">F</span>
                     </span>
                  </td>

                  {/* STATUT */}
                  <td className="px-6 py-4 text-center">
                    {tx.status === 'SUCCESS' && (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/5 gap-1">
                            <CheckCircle2 size={10} /> PAYÉ
                        </Badge>
                    )}
                    {tx.status === 'PENDING' && (
                        <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/5 gap-1 animate-pulse">
                            <Clock size={10} /> EN ATTENTE
                        </Badge>
                    )}
                    {tx.status === 'FAILED' && (
                        <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/5 gap-1">
                            <XCircle size={10} /> ÉCHEC
                        </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
