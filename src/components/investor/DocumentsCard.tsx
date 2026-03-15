'use client';

import { FileText, Download, CheckCircle, Lock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
// ✅ IMPORT STRICT FRONT-END (Zéro Prisma)
import type { InvestorDashboardData } from "./DashboardView"; 

interface DocumentsCardProps {
  // ✅ TYPAGE DTO : On utilise le type extrait du parent
  contracts: InvestorDashboardData['investmentContracts']; 
  user: InvestorDashboardData;     
}

export default function DocumentsCard({ contracts, user }: DocumentsCardProps) {
  const router = useRouter();

  const handleAccessDocument = (contract: InvestorDashboardData['investmentContracts'][0]) => {
    // ✅ FINI LE "ANY", TYPESCRIPT CONNAÎT MAINTENANT contractUrl
    if (contract.contractUrl) {
        toast.success("Téléchargement du document officiel...");
        window.open(contract.contractUrl, '_blank');
        return;
    }

    toast.info("Ouverture de la version numérique certifiée...");
    router.push(`/dashboard/investor/contract/${contract.id}`);
  };

  return (
    <div className="bg-[#0B1120] border border-white/5 rounded-3xl p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-white text-sm uppercase tracking-wide">Documents Légaux</h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded flex items-center gap-1">
                <CheckCircle className="w-3 h-3"/> Vérifié
            </span>
        </div>

        <div className="space-y-3 flex-1">
            {contracts && contracts.length > 0 ? (
                contracts.map((contract) => (
                    <div 
                        key={contract.id} 
                        onClick={() => handleAccessDocument(contract)}
                        className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-[#F59E0B]/30 hover:bg-white/[0.05] transition cursor-pointer group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${contract.status === 'ACTIVE' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-700/20 text-slate-500'}`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                {/* Le packName n'est pas dans le DTO pour l'instant, on utilise une valeur par défaut */}
                                <p className="text-sm font-bold text-white group-hover:text-[#F59E0B] transition">
                                    Contrat_Investissement.pdf
                                </p>
                                <p className="text-[10px] text-slate-500">
                                    {contract.status === 'ACTIVE' 
                                        ? `Signé le ${new Date(contract.signedAt).toLocaleDateString()}` 
                                        : "En attente de signature"}
                                </p>
                            </div>
                        </div>
                        
                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center group-hover:bg-[#F59E0B] group-hover:text-black transition">
                            {contract.contractUrl ? (
                                <Download className="w-4 h-4 text-slate-500 group-hover:text-black" />
                            ) : (
                                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-black" />
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center p-6 border border-dashed border-white/10 rounded-xl">
                    <p className="text-xs text-slate-500 italic">Aucun contrat signé.</p>
                </div>
            )}
            
             <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Relevé Fiscal 2026</p>
                        <p className="text-[10px] text-slate-500">Disponible fin d'exercice</p>
                    </div>
                </div>
                <Lock className="w-4 h-4 text-slate-600" />
            </div>
        </div>
    </div>
  );
}
