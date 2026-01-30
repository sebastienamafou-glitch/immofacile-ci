"use client";

import { ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";

// On définit une interface locale compatible avec les deux types potentiels
interface AnyTransaction {
  id: string;
  type: string; // "CREDIT" | "DEBIT"
  reason: string;
  amount: number;
  status: string;
  createdAt: Date | string;
}

interface TransactionListProps {
  transactions: AnyTransaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            <Clock className="w-10 h-10 mb-2 opacity-50" />
            <p>Aucune transaction pour le moment.</p>
        </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 shadow-xl bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 font-bold">Type</th>
              <th className="px-6 py-4 font-bold">Libellé</th>
              <th className="px-6 py-4 font-bold">Date</th>
              <th className="px-6 py-4 font-bold text-right">Montant</th>
              <th className="px-6 py-4 font-bold text-center">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-800/30 transition duration-150">
                <td className="px-6 py-4">
                   {tx.type === "CREDIT" ? (
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ArrowDownLeft size={12} className="mr-1" /> ENTRÉE
                       </span>
                   ) : (
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10">
                          <ArrowUpRight size={12} className="mr-1" /> SORTIE
                       </span>
                   )}
                </td>
                <td className="px-6 py-4 text-slate-200 font-medium">
                  {tx.reason}
                </td>
                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                  {new Date(tx.createdAt).toLocaleDateString("fr-FR", {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </td>
                <td className={`px-6 py-4 text-right font-bold font-mono text-base ${tx.type === "CREDIT" ? "text-emerald-400" : "text-white"}`}>
                   {tx.type === "CREDIT" ? "+" : "-"}{tx.amount.toLocaleString()} <span className="text-xs text-slate-600 font-normal">F</span>
                </td>
                <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-bold uppercase ${tx.status === 'SUCCESS' ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {tx.status}
                    </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
