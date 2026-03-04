import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FileText, CalendarDays, Home, Download, CheckCircle, Receipt } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import BackButton from "@/components/shared/BackButton";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic';

export default async function TenantReceiptsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // On récupère uniquement les paiements réussis de type LOYER ou DEPOSIT liés à ce locataire
  const payments = await prisma.payment.findMany({
    where: {
      status: "SUCCESS",
      type: { in: ["LOYER", "DEPOSIT"] },
      lease: { tenantId: session.user.id }
    },
    include: {
      lease: {
        include: {
          property: { select: { title: true, commune: true } }
        }
      }
    },
    orderBy: { date: 'desc' }
  });

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <BackButton />
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight mt-2">
          <Receipt className="text-orange-500 w-8 h-8" />
          Mes Quittances de Loyer
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Retrouvez l'historique de vos paiements et téléchargez vos justificatifs légaux.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {payments.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium text-lg">Aucune quittance disponible.</p>
                <p className="text-sm">Vos quittances apparaîtront ici dès votre premier paiement de loyer validé.</p>
            </div>
        ) : (
            <div className="divide-y divide-slate-100">
                {payments.map((payment) => (
                    <div key={payment.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition">
                        
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                    {payment.lease?.property.title}
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest bg-slate-100 border-none text-slate-600">
                                        {payment.type === "DEPOSIT" ? "Caution + Loyer" : "Loyer Mensuel"}
                                    </Badge>
                                </h4>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-medium mt-1">
                                    <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-slate-400" /> {format(new Date(payment.date), "MMMM yyyy", { locale: fr })}</span>
                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                    <span className="flex items-center gap-1.5"><Home className="w-4 h-4 text-slate-400" /> {payment.lease?.property.commune}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5 font-mono">Réf: {payment.reference}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t border-slate-100 md:border-none pt-4 md:pt-0 mt-2 md:mt-0">
                            <div className="text-left md:text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Montant Payé</p>
                                <p className="font-black text-slate-900 text-xl">{payment.amount.toLocaleString()} FCFA</p>
                            </div>
                            
                            <Link href={`/dashboard/tenant/receipts/${payment.id}`}>
                                <button className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm">
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Quittance</span>
                                </button>
                            </Link>
                        </div>

                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
