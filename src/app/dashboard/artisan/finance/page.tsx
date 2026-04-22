import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Wallet, TrendingUp, Loader2, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function ArtisanFinancePage() {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const artisan = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
        id: true, 
        role: true,
        incidentsAssigned: {
            where: { status: { in: ['IN_PROGRESS'] } }
        },
        transactions: {
            where: { status: 'SUCCESS' },
            orderBy: { createdAt: 'desc' },
            take: 20
        }
    }
  });

  if (!artisan || (artisan.role !== "ARTISAN" && artisan.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  // --- CALCUL DES KPI (Option A : Basé sur les Transactions) ---

  // 1. Chiffre d'Affaires Global
  const globalRevenueStats = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
        userId: userId,
        type: 'CREDIT',
        status: 'SUCCESS'
    }
  });
  const totalEarnings = globalRevenueStats._sum.amount || 0;

  // 2. Chiffre d'Affaires du Mois
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
  const monthlyEarnings = monthlyRevenueStats._sum.amount || 0;

  const pendingJobs = artisan.incidentsAssigned.length;

  return (
    <div className="p-6 md:p-10 text-slate-200 font-sans min-h-screen bg-[#0B1120] max-w-7xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                  <Wallet className="w-8 h-8 text-orange-500" /> Mes Finances
              </h1>
              <p className="text-slate-400 text-sm mt-1">Suivi de vos revenus et facturations.</p>
          </div>
      </div>

      {/* INFORMATION SUR L'OPTION A */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="text-emerald-500 w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-200">
          <strong>Paiement Direct :</strong> Les paiements de vos devis sont transférés automatiquement sur votre compte Wave/Orange Money. Ce tableau de bord sert d'historique de facturation.
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* CA DU MOIS */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-24 h-24 text-white"/></div>
              <CardContent className="p-6 relative z-10">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wider">Revenus du mois</p>
                  <p className="text-4xl font-black text-white tracking-tight">
                      {monthlyEarnings.toLocaleString()} <span className="text-lg text-slate-500 font-medium">FCFA</span>
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 w-fit px-2 py-1 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Reçus sur votre compte
                  </div>
              </CardContent>
          </Card>

          {/* TOTAL GAGNÉ */}
          <Card className="bg-slate-900 border-slate-800 shadow-lg">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500"><Wallet className="w-6 h-6"/></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Global</span>
                  </div>
                  <div>
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1">Chiffre d'Affaires Total</p>
                      <p className="text-3xl font-black text-white">{totalEarnings.toLocaleString()} F</p>
                  </div>
              </CardContent>
          </Card>

          {/* EN COURS */}
          <Card className="bg-slate-900 border-slate-800 shadow-lg">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500"><Loader2 className="w-6 h-6"/></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Potentiel</span>
                  </div>
                  <div>
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1">Missions en cours</p>
                      <p className="text-3xl font-black text-white">{pendingJobs}</p>
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* LISTE DES TRANSACTIONS */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-lg">
          <div className="p-6 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white uppercase tracking-tight">Historique des Facturations</h3>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                      <tr>
                          <th className="p-6">Date</th>
                          <th className="p-6">Désignation</th>
                          <th className="p-6 text-right">Montant</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                      {artisan.transactions.length === 0 ? (
                          <tr>
                              <td colSpan={3} className="p-12 text-center text-slate-500 italic">
                                  Aucune transaction enregistrée.
                              </td>
                          </tr>
                      ) : (
                          artisan.transactions.map((tx) => (
                              <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors group">
                                  <td className="p-6 text-slate-400 font-medium whitespace-nowrap">
                                      {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="p-6">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition">
                                              <FileText className="w-4 h-4 text-slate-400" />
                                          </div>
                                          <div>
                                              <span className="font-bold text-white block">{tx.reason}</span>
                                              <span className="text-[10px] text-slate-500 font-mono">REF: {tx.reference || tx.id.slice(-8).toUpperCase()}</span>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-6 text-right font-black font-mono text-emerald-400 text-lg">
                                      +{tx.amount.toLocaleString()} F
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
