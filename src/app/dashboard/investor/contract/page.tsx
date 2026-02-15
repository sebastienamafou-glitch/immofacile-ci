import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, FileText, Search, ShieldCheck, Clock } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ContractHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Récupérer tous les contrats (Signés et En attente)
  const contracts = await prisma.investmentContract.findMany({
    where: { userId: session.user.id },
    orderBy: { signedAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 lg:p-10 font-sans pb-24">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/dashboard/investor" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour Dashboard
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
            <div>
                <h1 className="text-3xl font-black text-white mb-2">Mes Documents Légaux</h1>
                <p className="text-slate-400">Retrouvez ici l'historique de vos protocoles d'accord et preuves de signature.</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" /> Coffre-fort Numérique
            </div>
        </div>

        {contracts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">Aucun contrat disponible pour le moment.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {contracts.map((contract) => (
                    <Link 
                        key={contract.id} 
                        href={`/dashboard/investor/contract/${contract.id}`}
                        className="group bg-slate-900 border border-slate-800 hover:border-indigo-500 p-6 rounded-2xl flex items-center justify-between transition-all hover:bg-slate-800"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${contract.status === 'ACTIVE' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg group-hover:text-indigo-400 transition-colors">
                                    Contrat : {contract.packName || "Investissement Standard"}
                                </h3>
                                <p className="text-slate-500 text-sm font-mono mt-1">
                                    Réf: {contract.id.slice(-8).toUpperCase()} • {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(contract.amount)} FCFA
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                             {contract.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                    <ShieldCheck className="w-3 h-3" /> Signé
                                </span>
                             ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-widest border border-orange-500/20 animate-pulse">
                                    <Clock className="w-3 h-3" /> En attente
                                </span>
                             )}
                             <p className="text-xs text-slate-600 mt-2">
                                {new Date(contract.signedAt).toLocaleDateString()}
                             </p>
                        </div>
                    </Link>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
