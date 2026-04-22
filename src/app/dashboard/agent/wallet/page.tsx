import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Wallet, TrendingUp, History, UserCheck, AlertCircle } from "lucide-react";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function AgentWalletPage() {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const agent = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true, transactions: { orderBy: { createdAt: 'desc' }, take: 20 } }
  });

  if (!agent || (agent.role !== "AGENT" && agent.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  // CALCUL KPI - Option A : Calculs basés sur les transactions réelles
  
  // A. Chiffre d'Affaires Global (Toutes les transactions de crédit de l'agent)
  const globalRevenueStats = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
        userId: userId,
        type: 'CREDIT',
        status: 'SUCCESS'
    }
  });
  
  const totalRevenue = globalRevenueStats._sum.amount || 0;

  // B. Chiffre d'Affaires du Mois en Cours
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyRevenueStats = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
        userId: userId,
        type: 'CREDIT',
        status: 'SUCCESS',
        createdAt: { gte: startOfMonth }
    }
  });
  
  const monthlyRevenue = monthlyRevenueStats._sum.amount || 0;

  return (
    <div className="p-6 md:p-10 font-sans text-slate-200 min-h-screen pb-24 bg-[#0B1120] space-y-8 max-w-7xl mx-auto">
            
        {/* EN-TÊTE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                    <Wallet className="text-blue-500 w-8 h-8" /> Mes Commissions
                </h1>
                <p className="text-slate-400 mt-1">
                    Suivi de votre chiffre d'affaires en tant qu'agent.
                </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-lg border border-slate-800">
                <UserCheck size={16} className="text-slate-500" />
                <span className="text-sm font-mono text-slate-300">{agent.name}</span>
            </div>
        </div>

        {/* INFORMATION SUR L'OPTION A */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-emerald-500 w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-200">
                <strong>Paiement Direct :</strong> Vos commissions (ex: 5% sur le loyer d'entrée) sont versées automatiquement sur votre compte Wave/Orange Money. Cette page sert d'historique de vos revenus.
            </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARTE CA DU MOIS */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 border-none text-white shadow-2xl relative overflow-hidden rounded-2xl p-6">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp size={120} />
                </div>
                <h3 className="text-sm font-medium text-blue-200 uppercase tracking-wider font-bold mb-4">Commissions du mois</h3>
                <div className="text-5xl font-black tracking-tighter">
                    {monthlyRevenue.toLocaleString()} <span className="text-2xl font-normal opacity-80">F</span>
                </div>
            </div>

            {/* CARTE REVENUS TOTAUX */}
            <div className="bg-slate-900 border border-slate-800 shadow-lg rounded-2xl p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase">Commissions Globales</h3>
                    <Wallet className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                    <div className="text-4xl font-black text-white">
                        {totalRevenue.toLocaleString()} <span className="text-xl font-normal text-slate-500">F</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                        Total généré depuis votre inscription.
                    </p>
                </div>
            </div>
        </div>

        {/* HISTORIQUE DES TRANSACTIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                <History className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-white text-lg">Historique comptable</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                            <th className="p-4 pl-6">Date</th>
                            <th className="p-4">Détails</th>
                            <th className="p-4 text-right pr-6">Montant</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {(!agent.transactions || agent.transactions.length === 0) ? (
                            <tr>
                                <td colSpan={3} className="p-12 text-center text-slate-500 italic">
                                    Aucune transaction pour le moment.
                                </td>
                            </tr>
                        ) : (
                            agent.transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-800/20 transition">
                                    <td className="p-4 pl-6 text-slate-400 font-mono text-xs whitespace-nowrap">
                                        {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="p-4 text-slate-300 text-sm font-medium">
                                        {tx.reason}
                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">REF: {tx.reference || tx.id.slice(-8).toUpperCase()}</div>
                                    </td>
                                    <td className={`p-4 text-right pr-6 font-mono font-black ${tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-orange-400'}`}>
                                        {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount.toLocaleString()} F
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}
