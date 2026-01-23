import { Transaction } from "@prisma/client";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
        <div className="text-center py-10 text-slate-500">
            Aucune transaction pour le moment.
        </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800">
          <tr>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Motif</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3 text-right">Montant</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-slate-800/50 transition">
              <td className="px-4 py-3">
                 {tx.type === "CREDIT" ? (
                     <span className="flex items-center text-emerald-500 font-bold text-xs gap-1">
                        <ArrowDownLeft size={14} /> ENTRÉE
                     </span>
                 ) : (
                     <span className="flex items-center text-red-500 font-bold text-xs gap-1">
                        <ArrowUpRight size={14} /> SORTIE
                     </span>
                 )}
              </td>
              <td className="px-4 py-3 text-slate-300 font-medium">
                {tx.reason}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {new Date(tx.createdAt).toLocaleDateString("fr-FR")}
              </td>
              <td className={`px-4 py-3 text-right font-bold ${tx.type === "CREDIT" ? "text-emerald-500" : "text-white"}`}>
                 {tx.type === "CREDIT" ? "+" : "-"}{tx.amount.toLocaleString()} F
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
