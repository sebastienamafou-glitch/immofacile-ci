import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Wallet, TrendingUp, Lock, AlertCircle, Info, History } from "lucide-react";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function OwnerFinancePage() {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  });

  if (!owner || (owner.role !== "OWNER" && owner.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  // --- CALCUL DES KPI (Basé sur la réalité des transactions) ---

  // 1. Chiffre d'Affaires Global (Net perçu)
  const globalRevenueStats = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
        userId: userId,
        type: 'CREDIT',
        status: 'SUCCESS'
    }
  });
  const totalRevenue = globalRevenueStats._sum.amount || 0;

  // 2. Chiffre d'Affaires du Mois en Cours (Net perçu)
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

  // 3. Compte Séquestre (Somme des cautions des baux actifs de ce propriétaire)
  const activeLeases = await prisma.lease.aggregate({
    _sum: { depositAmount: true },
    where: {
        property: { ownerId: userId },
        status: 'ACTIVE'
    }
  });
  const escrowBalance = activeLeases._sum.depositAmount || 0;

  // 4. Historique des 20 dernières transactions
  const transactions = await prisma.transaction.findMany({
    where: { userId: userId, status: 'SUCCESS' },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return (
    <main className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 font-sans pb-20 relative max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
               <Wallet className="text-orange-500 w-8 h-8" /> Mes Finances
            </h1>
            <p className="text-slate-400 text-sm mt-1">Vue consolidée de vos revenus immobiliers nets.</p>
        </div>
      </div>

      {/* INFORMATION SUR L'OPTION A */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3 mb-8">
        <AlertCircle className="text-emerald-500 w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-200">
          <strong>Virements Automatiques :</strong> Vos revenus locatifs et réservations Akwaba sont transférés instantanément sur votre compte Mobile Money. Ce tableau de bord sert d'historique comptable et fiscal.
        </div>
      </div>

      {/* CARTES STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {/* Carte CA du Mois */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-6 rounded-[2rem] relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110">
                <TrendingUp size={100} />
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                    <TrendingUp size={20} />
                </div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Revenus du mois</h3>
            </div>
            <div className="text-4xl font-black text-white mb-2 tracking-tighter">
                {monthlyRevenue.toLocaleString()} <span className="text-lg text-orange-500">FCFA</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
                Net perçu sur votre Mobile Money.
            </p>
        </div>

        {/* Carte CA Global */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden shadow-lg">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <Wallet size={20} />
                </div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Revenus Globaux</h3>
            </div>
            <div className="text-4xl font-black text-white mb-2 tracking-tighter">
                {totalRevenue.toLocaleString()} <span className="text-lg text-slate-600">FCFA</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Total généré depuis votre inscription.</p>
        </div>

        {/* Carte Séquestre */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden shadow-lg">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                    <Lock size={20} />
                </div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Compte Séquestre</h3>
            </div>
            <div className="text-4xl font-black text-white mb-2 tracking-tighter">
                {escrowBalance.toLocaleString()} <span className="text-lg text-slate-600">FCFA</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Total des cautions actives (Bloqué par la plateforme).</p>
        </div>
      </div>

      {/* --- TABLEAU UNIFIÉ DES TRANSACTIONS --- */}
      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
        <History className="text-slate-500 w-6 h-6" /> Historique Comptable
      </h3>
      
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-lg">
        {transactions.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                        <tr>
                            <th className="p-6">Date</th>
                            <th className="p-6">Motif</th>
                            <th className="p-6">Référence</th>
                            <th className="p-6 text-right text-emerald-500">Montant Net (Reçu)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-800/50 transition group">
                                <td className="p-6 text-slate-400 font-medium whitespace-nowrap">
                                    {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="p-6">
                                    <div className="font-bold text-white">
                                        {tx.reason}
                                    </div>
                                </td>
                                <td className="p-6 text-slate-500 font-mono text-xs">
                                    {tx.reference || tx.id.slice(-8).toUpperCase()}
                                </td>
                                <td className="p-6 text-right font-mono font-black text-emerald-500 text-lg">
                                    +{tx.amount.toLocaleString()} F
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="p-10 text-center flex flex-col items-center">
                <AlertCircle className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-slate-400">Aucune transaction enregistrée pour le moment.</p>
            </div>
        )}
      </div>
    </main>
  );
}
