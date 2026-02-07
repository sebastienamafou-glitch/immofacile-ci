
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, History, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WithdrawForm from "@/components/agency/WithdrawForm"; 
import TransactionList from "@/components/agency/TransactionList";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function AgencyWalletPage() {
  // 1. SÉCURITÉ ZERO TRUST (Auth v5)
const session = await auth();

// Si aucune session ou pas d'ID utilisateur, redirection immédiate vers le login
if (!session || !session.user?.id) {
  redirect("/login");
}

const userId = session.user.id;

  // 2. VÉRIFICATION ADMIN & AGENCE
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, agencyId: true }
  });

  if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  // 3. RÉCUPÉRATION DONNÉES FINANCIÈRES DE L'AGENCE (B2B)
  const agency = await prisma.agency.findUnique({
    where: { id: admin.agencyId },
    include: { 
        // On récupère les 20 dernières transactions DE L'AGENCE (AgencyTransaction)
        transactions: {
            orderBy: { createdAt: 'desc' },
            take: 20
        }
    }
  });

  if (!agency) redirect("/dashboard");

  // 4. CALCUL KPI (Fintech)
  // A. Commissions sur Location Saisonnière
  const shortTermStats = await prisma.bookingPayment.aggregate({
    _sum: { agencyCommission: true },
    where: {
        booking: { listing: { agencyId: agency.id } },
        status: "SUCCESS"
    }
  });

  // B. Honoraires sur Gestion Longue Durée
  const longTermStats = await prisma.payment.aggregate({
    _sum: { amountAgency: true }, // ✅ Correction : amountAgency (pas amountAgent qui est pour le freelance)
    where: {
        lease: { property: { agencyId: agency.id } },
        status: "SUCCESS"
    }
  });

  const totalRevenue = (shortTermStats._sum.agencyCommission || 0) + (longTermStats._sum.amountAgency || 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-[#020617] text-slate-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
             <Wallet className="text-orange-500 w-8 h-8" /> Portefeuille Agence
          </h1>
          <p className="text-slate-400 mt-1">
            Finance & Trésorerie de <span className="text-white font-bold">{agency.name}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-lg border border-slate-800">
            <Building2 size={16} className="text-slate-500" />
            <span className="text-sm font-mono text-slate-300">ID: {agency.code}</span>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CARTE SOLDE PRINCIPAL (Withdrawal Ready) */}
          <Card className="bg-gradient-to-br from-orange-600 to-orange-800 border-none text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Wallet size={120} />
              </div>
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-200 uppercase tracking-wider font-bold">Solde Disponible</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-5xl font-black tracking-tighter">
                      {agency.walletBalance.toLocaleString()} <span className="text-2xl font-normal opacity-80">F</span>
                  </div>
                  <div className="mt-6">
                      <WithdrawForm maxAmount={agency.walletBalance} />
                  </div>
              </CardContent>
          </Card>

          {/* CARTE REVENUS TOTAUX */}
          <Card className="bg-slate-900 border-slate-800 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-slate-400 uppercase">Chiffre d'Affaires</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-black text-white">
                      {totalRevenue.toLocaleString()} <span className="text-lg font-normal text-slate-500">F</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                      Commissions cumulées (Court + Long terme)
                  </p>
              </CardContent>
          </Card>

          {/* CARTE MOUVEMENTS */}
          <Card className="bg-slate-900 border-slate-800 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-slate-400 uppercase">Flux du mois</CardTitle>
                  <History className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                  <div className="space-y-4 mt-2">
                      <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-emerald-400 font-bold"><ArrowDownLeft size={16} className="mr-2"/> Entrées</span>
                          <span className="text-white font-mono font-bold">{(shortTermStats._sum.agencyCommission || 0).toLocaleString()} F</span>
                      </div>
                      <div className="w-full h-[1px] bg-slate-800"></div>
                      <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-slate-500 font-bold"><ArrowUpRight size={16} className="mr-2"/> Sorties</span>
                          <span className="text-slate-500 font-mono">--</span> 
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* HISTORIQUE TRANSACTIONS */}
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="text-slate-500" /> Historique des Transactions
          </h3>
          {/* Mapping pour compatibilité format Date si nécessaire */}
          <TransactionList transactions={agency.transactions.map(t => ({
              ...t,
              createdAt: t.createdAt.toISOString()
          }))} />
      </div>
    </div>
  );
}
