import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { 
  Users, TrendingUp, Download, Plus, 
  Search, Filter, FileText, ShieldCheck, AlertCircle 
} from "lucide-react";
import { redirect } from "next/navigation"; // Sécurité si besoin

// Fonction utilitaire pour le formatage monétaire (si tu ne l'as pas ailleurs)
const formatFCFA = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
};

export default async function InvestorsListPage() {
  
  // 1. RÉCUPÉRATION DES DONNÉES (Optimisée)
  const investors = await prisma.user.findMany({
    where: { 
        role: "INVESTOR" // On ne veut que les actionnaires
    },
    orderBy: { createdAt: 'desc' },
    include: {
        investmentContracts: true, // Pour vérifier la signature
        _count: {
            select: { investmentContracts: true }
        }
    }
  });

  // 2. CALCUL DES KPIs
  const totalRaised = investors.reduce((acc, inv) => acc + inv.walletBalance, 0);
  const totalInvestors = investors.length;
  // On considère un dossier complet si au moins 1 contrat est signé
  const fullyCompliant = investors.filter(i => i.investmentContracts.length > 0).length;

  return (
    <div className="p-8 space-y-8 bg-[#020617] min-h-screen text-slate-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Users className="w-8 h-8 text-[#F59E0B]" />
                Actionnariat
            </h1>
            <p className="text-slate-500 text-sm mt-1">Gestion des levées de fonds et partenaires.</p>
        </div>
        <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition flex items-center gap-2">
                <Download className="w-4 h-4"/> Export CSV
            </button>
            <Link 
                href="/dashboard/superadmin/investors/new" 
                className="px-6 py-2 bg-[#F59E0B] hover:bg-orange-500 text-black font-bold rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
                <Plus className="w-4 h-4" /> Nouvel Investisseur
            </Link>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARTE 1 : CAPITAUX */}
        <div className="bg-[#0B1120] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition">
                <TrendingUp className="w-16 h-16" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Capitaux Levés</p>
            <p className="text-3xl font-black text-white">{formatFCFA(totalRaised)}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 w-fit px-2 py-1 rounded">
                <TrendingUp className="w-3 h-3"/> +100% vs Année N-1
            </div>
        </div>

        {/* CARTE 2 : INVESTISSEURS */}
        <div className="bg-[#0B1120] border border-white/5 p-6 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nombre d'Actionnaires</p>
            <p className="text-3xl font-black text-white">{totalInvestors}</p>
            <p className="text-xs text-slate-500 mt-2">Dont <span className="text-white font-bold">{investors.filter(i => i.backerTier === 'VISIONNAIRE').length}</span> Visionnaires</p>
        </div>

        {/* CARTE 3 : CONFORMITÉ */}
        <div className="bg-[#0B1120] border border-white/5 p-6 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Dossiers Complets (Signés)</p>
            <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-white">{fullyCompliant}</p>
                <p className="text-sm text-slate-500 mb-1">/ {totalInvestors}</p>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-4 overflow-hidden">
                <div 
                    className="bg-[#F59E0B] h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${(fullyCompliant / totalInvestors) * 100}%` }}
                ></div>
            </div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-[#0B1120] border border-white/5 rounded-2xl overflow-hidden">
        
        {/* FILTRES (Visuel) */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500"/>
                <input 
                    type="text" 
                    placeholder="Rechercher un actionnaire..." 
                    className="w-full bg-[#020617] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-[#F59E0B] outline-none transition"
                />
            </div>
            <button className="p-2 border border-white/10 rounded-lg hover:bg-white/5 text-slate-400">
                <Filter className="w-4 h-4" />
            </button>
        </div>

        {/* LISTE */}
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400 font-bold uppercase text-xs">
                    <tr>
                        <th className="p-4">Investisseur</th>
                        <th className="p-4">Pack & Statut</th>
                        <th className="p-4">Montant Investi</th>
                        <th className="p-4 text-center">Contrat</th>
                        <th className="p-4">Date d'entrée</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {investors.map((investor) => {
                        const hasSigned = investor.investmentContracts.length > 0;
                        
                        // Badge couleur selon le pack
                        let packColor = "bg-slate-500/10 text-slate-500 border-slate-500/20";
                        if (investor.backerTier === 'VISIONNAIRE') packColor = "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20";
                        if (investor.backerTier === 'AMBASSADEUR') packColor = "bg-blue-500/10 text-blue-500 border-blue-500/20";
                        if (investor.backerTier === 'SUPPORTER') packColor = "bg-purple-500/10 text-purple-500 border-purple-500/20";

                        return (
                            <tr key={investor.id} className="hover:bg-white/[0.02] transition group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
                                            {investor.name?.charAt(0) || "U"}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{investor.name || "Sans Nom"}</p>
                                            <p className="text-xs text-slate-500">{investor.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${packColor}`}>
                                        {investor.backerTier || "STANDARD"}
                                    </span>
                                </td>
                                <td className="p-4 font-mono font-bold text-white">
                                    {formatFCFA(investor.walletBalance)}
                                </td>
                                <td className="p-4 text-center">
                                    {hasSigned ? (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs font-bold border border-emerald-500/20">
                                            <ShieldCheck className="w-3 h-3"/> Signé
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-bold border border-red-500/20 animate-pulse">
                                            <AlertCircle className="w-3 h-3"/> En attente
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-slate-500">
                                    {new Date(investor.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right">
                                    <button className="text-slate-400 hover:text-white font-bold text-xs underline decoration-dotted">
                                        Gérer
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    
                    {investors.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-500">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                                <p>Aucun investisseur pour le moment.</p>
                                <Link href="/dashboard/superadmin/investors/new" className="text-[#F59E0B] hover:underline text-sm font-bold mt-2 inline-block">
                                    Créer le premier
                                </Link>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
