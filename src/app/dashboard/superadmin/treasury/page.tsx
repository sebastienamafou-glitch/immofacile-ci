import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth"; // ✅ Import de la session sécurisée
import { 
  Building, TrendingUp, TrendingDown, Wallet, 
  ArrowUpRight, ArrowDownLeft, Download, Filter, Search
} from "lucide-react";

// Fonction de formatage monétaire
const formatFCFA = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
};

export default async function TreasuryPage() {
  
  // 1. SÉCURITÉ ZERO TRUST (Auth v5)
  // On récupère la session directement côté serveur
  const session = await auth();
  
  // Si pas de session ou pas l'ID, éjection immédiate vers le login
  if (!session || !session.user?.id) {
    redirect("/login");
  }

  // Vérification stricte du rôle Super Admin pour cette page sensible
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  // 2. RÉCUPÉRATION DES DONNÉES RÉELLES
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
        user: {
            select: { name: true, email: true, role: true }
        }
    },
    take: 100 // Limite de performance
  });

  // 3. CALCULS DES TOTAUX
  const stats = transactions.reduce((acc, tx) => {
    if (tx.type === 'CREDIT') {
        acc.income += tx.amount;
    } else if (tx.type === 'DEBIT') {
        acc.expense += tx.amount;
    }
    return acc;
  }, { income: 0, expense: 0 });

  const netBalance = stats.income - stats.expense;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8 font-sans pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-black uppercase tracking-widest mb-3">
             <Building className="w-3 h-3" /> Finance Centrale
           </div>
           <h1 className="text-3xl font-black text-white tracking-tight">
             Trésorerie & Flux
           </h1>
           <p className="text-slate-500 text-sm mt-1">
             Vue consolidée des encaissements (Investissements/Loyers) et décaissements.
           </p>
        </div>

        <button className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition flex items-center gap-2">
            <Download className="w-4 h-4"/> Exporter le Grand Livre
        </button>
      </div>

      {/* KPI CARDS (TOTAUX) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          <div className="bg-[#0B1120] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition">
                  <ArrowUpRight className="w-20 h-20 text-emerald-500"/>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Entrées</p>
              <p className="text-3xl font-black text-white">{formatFCFA(stats.income)}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                  <TrendingUp className="w-3 h-3"/> Investissements & Loyers
              </div>
          </div>

          <div className="bg-[#0B1120] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition">
                  <ArrowDownLeft className="w-20 h-20 text-red-500"/>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Sorties</p>
              <p className="text-3xl font-black text-white">{formatFCFA(stats.expense)}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">
                  <TrendingDown className="w-3 h-3"/> Retraits & Dividendes
              </div>
          </div>

          <div className="bg-[#0B1120] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-[#F59E0B]/30 transition">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition">
                  <Wallet className="w-20 h-20 text-[#F59E0B]"/>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Flux Net (Volume)</p>
              <p className="text-3xl font-black text-[#F59E0B]">{formatFCFA(netBalance)}</p>
              <p className="text-xs text-slate-500 mt-2">Volume théorique transité sur la plateforme.</p>
          </div>
      </div>

      {/* TABLEAU DES TRANSACTIONS */}
      <div className="bg-[#0B1120] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Flux en temps réel
            </div>
            <div className="flex gap-2">
                 <button className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition"><Search className="w-4 h-4"/></button>
                 <button className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition"><Filter className="w-4 h-4"/></button>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.02] text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-white/5">
                    <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Acteur</th>
                        <th className="p-4">Type de flux</th>
                        <th className="p-4">Libellé / Motif</th>
                        <th className="p-4 text-right">Montant</th>
                        <th className="p-4 text-center">Statut</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                            <td className="p-4 font-mono text-slate-500 text-xs">
                                {new Date(tx.createdAt).toLocaleDateString()} <br/>
                                <span className="opacity-50">{new Date(tx.createdAt).toLocaleTimeString()}</span>
                            </td>
                            <td className="p-4">
                                <div className="font-bold text-white">{tx.user?.name || 'Système'}</div>
                                <div className="text-[10px] text-slate-500">{tx.user?.role}</div>
                            </td>
                            <td className="p-4">
                                {tx.type === 'CREDIT' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">
                                        <ArrowUpRight className="w-3 h-3" /> ENTRÉE
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-500 text-[10px] font-bold border border-red-500/20">
                                        <ArrowDownLeft className="w-3 h-3" /> SORTIE
                                    </span>
                                )}
                            </td>
                            <td className="p-4 text-slate-300">
                                {tx.reason || 'Transaction standard'}
                            </td>
                            <td className={`p-4 text-right font-mono font-bold ${tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-white'}`}>
                                {tx.type === 'CREDIT' ? '+' : '-'}{formatFCFA(tx.amount)}
                            </td>
                            <td className="p-4 text-center">
                                {tx.status === 'COMPLETED' || tx.status === 'SUCCESS' ? (
                                     <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto shadow-[0_0_10px_rgba(16,185,129,0.5)]" title="Succès"></div>
                                ) : (
                                     <div className="w-2 h-2 rounded-full bg-orange-500 mx-auto animate-pulse" title="En attente"></div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {transactions.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 italic">Aucune transaction enregistrée.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
