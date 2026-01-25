import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { 
  Users, TrendingUp, Download, Plus, 
  Search, Filter, CheckCircle, XCircle, Ban 
} from "lucide-react";
// ✅ IMPORT DES TYPES PRISMA POUR ÉVITER LES ERREURS DE TYPAGE
import { User, InvestmentContract } from "@prisma/client";

export const dynamic = 'force-dynamic';

const formatFCFA = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
};

// ✅ DÉFINITION DU TYPE POUR LE TABLEAU
type InvestorWithContracts = User & {
  investmentContracts: InvestmentContract[];
};

export default async function InvestorsListPage() {
  
  // ✅ CORRECTION : TYPAGE EXPLICITE DU TABLEAU (Plus d'erreur "implicit any")
  let investors: InvestorWithContracts[] = [];
  
  try {
    investors = await prisma.user.findMany({
      where: { 
          role: "INVESTOR" 
      },
      orderBy: { createdAt: 'desc' },
      include: {
          investmentContracts: true,
          _count: {
              select: { investmentContracts: true }
          }
      }
    });
  } catch (error) {
    console.error("🚨 ERREUR CRITIQUE DB (Investisseurs):", error);
  }

  const totalRaised = investors.reduce((acc, inv) => acc + (inv.walletBalance || 0), 0);
  const totalInvestors = investors.length;
  const fullyCompliant = investors.filter(i => (i.investmentContracts?.length || 0) > 0).length;

  return (
    <div className="p-8 space-y-8 bg-[#020617] min-h-screen text-slate-300 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Users className="w-8 h-8 text-[#F59E0B]" />
                Actionnariat & Fonds
            </h1>
            <p className="text-slate-500 text-sm mt-1">
                Pilotage des {totalInvestors} partenaires financiers.
            </p>
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
        <div className="bg-[#0B1120] border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-[#F59E0B]/30 transition duration-500">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition">
                <TrendingUp className="w-16 h-16 text-[#F59E0B]" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Capitaux Levés</p>
            <p className="text-4xl font-black text-white tracking-tight">{formatFCFA(totalRaised)}</p>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 w-fit px-2 py-1 rounded border border-emerald-500/20">
                <TrendingUp className="w-3 h-3"/> Performance Nette
            </div>
        </div>

        <div className="bg-[#0B1120] border border-white/5 p-6 rounded-2xl hover:border-blue-500/30 transition duration-500">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Structure du Capital</p>
            <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-white">{totalInvestors}</p>
                <span className="text-sm text-slate-500">Actionnaires</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 bg-white/5 w-fit px-2 py-1 rounded">
                Dont <span className="text-white font-bold">{investors.filter(i => i.backerTier === 'VISIONNAIRE').length}</span> Visionnaires (Gold)
            </p>
        </div>

        <div className="bg-[#0B1120] border border-white/5 p-6 rounded-2xl hover:border-emerald-500/30 transition duration-500">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Conformité (Signatures)</p>
            <div className="flex items-end gap-2">
                <p className="text-4xl font-black text-emerald-400">{fullyCompliant}</p>
                <p className="text-sm text-slate-500 mb-1 font-bold">/ {totalInvestors} dossiers</p>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-4 overflow-hidden">
                <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                    style={{ width: totalInvestors > 0 ? `${(fullyCompliant / totalInvestors) * 100}%` : '0%' }}
                ></div>
            </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#0B1120] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 bg-white/[0.02]">
            <div className="relative flex-1 max-w-sm w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500"/>
                <input 
                    type="text" 
                    placeholder="Rechercher (Nom, Email, Tier)..." 
                    className="w-full bg-[#020617] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#F59E0B] outline-none transition placeholder:text-slate-600"
                />
            </div>
            <button className="p-2.5 border border-white/10 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition">
                <Filter className="w-4 h-4" />
            </button>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                        <th className="p-4 pl-6">Investisseur</th>
                        <th className="p-4">Pack & Statut</th>
                        <th className="p-4">Montant Investi</th>
                        <th className="p-4 text-center">Contrat Juridique</th>
                        <th className="p-4">Date d'entrée</th>
                        <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {investors.map((investor) => {
                        const hasSigned = (investor.investmentContracts?.length || 0) > 0;
                        
                        let packColor = "bg-slate-500/10 text-slate-500 border-slate-500/20";
                        if (investor.backerTier === 'VISIONNAIRE') packColor = "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]";
                        if (investor.backerTier === 'AMBASSADEUR') packColor = "bg-blue-500/10 text-blue-500 border-blue-500/20";
                        if (investor.backerTier === 'SUPPORTER') packColor = "bg-purple-500/10 text-purple-500 border-purple-500/20";

                        return (
                            <tr key={investor.id} className="hover:bg-white/[0.02] transition group">
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold shadow-inner ${
                                            investor.isActive 
                                            ? 'bg-gradient-to-br from-white/5 to-white/10 border-white/5 text-white' 
                                            : 'bg-red-500/10 border-red-500/20 text-red-500'
                                        }`}>
                                            {investor.isActive ? (investor.name?.charAt(0) || "U") : <Ban className="w-4 h-4"/>}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-base ${investor.isActive ? 'text-white' : 'text-red-400 line-through'}`}>
                                                {investor.name || "Utilisateur Inconnu"}
                                            </p>
                                            <p className="text-xs text-slate-500 font-mono">{investor.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${packColor}`}>
                                        {investor.backerTier || "STANDARD"}
                                    </span>
                                </td>
                                <td className="p-4 font-mono font-bold text-emerald-400 text-base">
                                    {formatFCFA(investor.walletBalance || 0)}
                                </td>
                                <td className="p-4 text-center">
                                    {hasSigned ? (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold border border-emerald-500/20">
                                            <CheckCircle className="w-3.5 h-3.5"/> SIGNÉ
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-bold border border-red-500/20 opacity-80 animate-pulse">
                                            <XCircle className="w-3.5 h-3.5"/> EN ATTENTE
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-slate-500 font-mono text-xs">
                                    {new Date(investor.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right pr-6">
                                    <button className="text-slate-400 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition text-xs font-bold border border-transparent hover:border-white/10">
                                        Gérer
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    
                    {investors.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-16 text-center text-slate-500">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 opacity-20"/>
                                </div>
                                <p className="font-medium text-white">Aucun investisseur trouvé.</p>
                                <Link 
                                    href="/dashboard/superadmin/investors/new" 
                                    className="px-4 py-2 bg-[#F59E0B] text-black font-bold rounded-lg text-sm inline-block hover:bg-orange-500 transition"
                                >
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
