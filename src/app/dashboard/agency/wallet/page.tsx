import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WithdrawForm from "@/components/agency/wallet/WithdrawForm";
import TransactionList from "@/components/agency/wallet/TransactionList";

export const dynamic = 'force-dynamic';

export default async function AgencyWalletPage() {
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { 
        agency: true,
        // On récupère les 10 dernières transactions pour l'historique
        transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10
        }
    }
  });

  if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agency) {
    redirect("/dashboard");
  }

  // 1. Calcul des Revenus Totaux (Lifetime)
  // A. Commissions sur Location Saisonnière (BookingPayment.agencyCommission)
  const shortTermStats = await prisma.bookingPayment.aggregate({
    _sum: { agencyCommission: true },
    where: {
        booking: { listing: { agencyId: admin.agency.id } }, // Lié à l'agence
        status: "SUCCESS"
    }
  });

  // B. Honoraires sur Gestion Longue Durée (Payment.amountAgent)
  const longTermStats = await prisma.payment.aggregate({
    _sum: { amountAgent: true },
    where: {
        lease: { property: { agencyId: admin.agency.id } }, // Lié à l'agence
        status: "SUCCESS"
    }
  });

  const totalRevenue = (shortTermStats._sum.agencyCommission || 0) + (longTermStats._sum.amountAgent || 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
             <Wallet className="text-orange-500" /> Portefeuille Agence
        </h1>
        <p className="text-slate-400 mt-1">
            Gérez votre trésorerie, vos commissions et vos retraits.
        </p>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CARTE SOLDE PRINCIPAL (Withdrawal Ready) */}
          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-none text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Wallet size={100} />
              </div>
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-100 uppercase tracking-wider">Solde Disponible</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-4xl font-black">
                      {admin.walletBalance.toLocaleString()} <span className="text-lg font-normal">FCFA</span>
                  </div>
                  <div className="mt-4">
                      <WithdrawForm maxAmount={admin.walletBalance} />
                  </div>
              </CardContent>
          </Card>

          {/* CARTE REVENUS TOTAUX */}
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400 uppercase">Chiffre d'Affaires (Commissions)</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-white">
                      {totalRevenue.toLocaleString()} FCFA
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                      Cumul des gains (Court + Long terme)
                  </p>
              </CardContent>
          </Card>

          {/* CARTE MOUVEMENTS */}
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400 uppercase">Dernière activité</CardTitle>
                  <History className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                  <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-emerald-400"><ArrowDownLeft size={16} className="mr-1"/> Entrées</span>
                          <span className="text-white font-mono">{(shortTermStats._sum.agencyCommission || 0).toLocaleString()} F</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-red-400"><ArrowUpRight size={16} className="mr-1"/> Retraits</span>
                          {/* Note: Pour les retraits totaux, il faudrait une autre requête aggregate sur Transaction type='DEBIT' */}
                          <span className="text-white font-mono">--</span> 
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* HISTORIQUE TRANSACTIONS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <History className="text-slate-500" /> Historique des Transactions
          </h3>
          <TransactionList transactions={admin.transactions} />
      </div>
    </div>
  );
}
