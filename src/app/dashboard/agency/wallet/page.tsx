import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Wallet, TrendingUp, History, Building2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TransactionList from "@/components/agency/TransactionList";
import UnpaidRentsTable from "@/components/agency/UnpaidRentsTable";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function AgencyWalletPage() {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, agencyId: true }
  });

  if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  const agency = await prisma.agency.findUnique({
    where: { id: admin.agencyId },
    include: { 
        transactions: {
            orderBy: { createdAt: 'desc' },
            take: 20
        }
    }
  });

  if (!agency) redirect("/dashboard");

  // RÉCUPÉRATION DES IMPAYÉS ET RETARDS
  const rawPendingSchedules = await prisma.rentSchedule.findMany({
    where: {
      status: { in: ['PENDING', 'LATE'] },
      lease: {
        property: { agencyId: agency.id }
      }
    },
    include: {
      lease: {
        select: {
          property: { select: { title: true } },
          tenant: { select: { name: true, phone: true, email: true } }
        }
      }
    },
    orderBy: { expectedDate: 'asc' }
  });

  const scheduleIds = rawPendingSchedules.map(s => s.id);

  // RÉCUPÉRATION DE L'HISTORIQUE DES RELANCES
  const reminderLogs = await prisma.auditLog.findMany({
    where: {
      entityType: "RENT_SCHEDULE",
      entityId: { in: scheduleIds }
    },
    orderBy: { createdAt: 'desc' }
  });

  const pendingSchedules = rawPendingSchedules.map(schedule => {
    const scheduleLogs = reminderLogs.filter(log => 
        log.entityId === schedule.id && 
        (log.metadata as any)?.actionOrigin === "MANUAL_RENT_REMINDER"
    );

    return {
        ...schedule,
        reminderCount: scheduleLogs.length,
        lastReminderAt: scheduleLogs.length > 0 ? scheduleLogs[0].createdAt.toISOString() : null
    };
  });

  // CALCUL KPI - Option A : Calculs basés sur les transactions réelles
  
  // A. Chiffre d'Affaires Global (Toutes les transactions de crédit de l'agence)
  const globalRevenueStats = await prisma.agencyTransaction.aggregate({
    _sum: { amount: true },
    where: {
        agencyId: agency.id,
        type: 'CREDIT',
        status: 'SUCCESS'
    }
  });
  
  const totalRevenue = globalRevenueStats._sum.amount || 0;

  // B. Chiffre d'Affaires du Mois en Cours
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyRevenueStats = await prisma.agencyTransaction.aggregate({
    _sum: { amount: true },
    where: {
        agencyId: agency.id,
        type: 'CREDIT',
        status: 'SUCCESS',
        createdAt: { gte: startOfMonth }
    }
  });
  
  const monthlyRevenue = monthlyRevenueStats._sum.amount || 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-[#020617] text-slate-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
             <Wallet className="text-orange-500 w-8 h-8" /> Portefeuille Agence
          </h1>
          <p className="text-slate-400 mt-1">
            Revenus &amp; Comptabilité de <span className="text-white font-bold">{agency.name}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-lg border border-slate-800">
            <Building2 size={16} className="text-slate-500" />
            <span className="text-sm font-mono text-slate-300">ID: {agency.code}</span>
        </div>
      </div>

      {/* INFORMATION SUR L'OPTION A */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="text-blue-500 w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-200">
          <strong>Mode Paiement Direct :</strong> Les commissions de votre agence sont versées automatiquement sur votre compte de dépôt. Ce tableau de bord sert d&apos;historique comptable.
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARTE CA DU MOIS */}
          <Card className="bg-gradient-to-br from-orange-600 to-orange-800 border-none text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                  <TrendingUp size={120} />
              </div>
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-200 uppercase tracking-wider font-bold">Chiffre d&apos;Affaires (Mois en cours)</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-5xl font-black tracking-tighter">
                      {monthlyRevenue.toLocaleString()} <span className="text-2xl font-normal opacity-80">F</span>
                  </div>
              </CardContent>
          </Card>

          {/* CARTE REVENUS TOTAUX */}
          <Card className="bg-slate-900 border-slate-800 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-slate-400 uppercase">Chiffre d&apos;Affaires (Global)</CardTitle>
                  <Wallet className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                  <div className="text-4xl font-black text-white mt-2">
                      {totalRevenue.toLocaleString()} <span className="text-xl font-normal text-slate-500">F</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                      Total des commissions générées depuis la création.
                  </p>
              </CardContent>
          </Card>
      </div>

      {/* MODULE DE RELANCE DES IMPAYÉS */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <UnpaidRentsTable schedules={pendingSchedules} />
      </div>

      {/* HISTORIQUE TRANSACTIONS */}
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="text-slate-500" /> Historique Comptable
          </h3>
          <TransactionList transactions={agency.transactions.map(t => ({
              ...t,
              createdAt: t.createdAt.toISOString()
          }))} />
      </div>
    </div>
  );
}
