'use client';

import { FileText, Download, CheckCircle, Lock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DocumentsCardProps {
  contracts: any[];
  user: any; 
}

export default function DocumentsCard({ contracts, user }: DocumentsCardProps) {
  const router = useRouter();

  const handleAccessDocument = (contract: any) => {
    // CAS 1 : Le PDF est déjà stocké sur le Cloud (S3/Cloudinary)
    if (contract.contractUrl) {
        toast.success("Téléchargement du document officiel...");
        window.open(contract.contractUrl, '_blank');
        return;
    }

    // CAS 2 : Pas de PDF stocké -> On ouvre la Vue Numérique Certifiée (Fallback)
    // C'est la page que nous avons créée : src/app/dashboard/investor/contract/[id]/page.tsx
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
                contracts.map((contract, idx) => (
                    <div 
                        key={contract.id || idx} 
                        onClick={() => handleAccessDocument(contract)}
                        className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-[#F59E0B]/30 hover:bg-white/[0.05] transition cursor-pointer group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${contract.status === 'ACTIVE' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-700/20 text-slate-500'}`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white group-hover:text-[#F59E0B] transition">
                                    {contract.packName ? `Contrat_${contract.packName}.pdf` : "Contrat_Investissement.pdf"}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                    {contract.status === 'ACTIVE' 
                                        ? `Signé le ${new Date(contract.signedAt || contract.createdAt).toLocaleDateString()}` 
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
            
            {/* Relevé Fiscal (Placeholder) */}
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
