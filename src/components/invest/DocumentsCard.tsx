'use client';

import { FileText, Download, CheckCircle, Lock } from "lucide-react";
import { toast } from "sonner";
// Import du générateur que nous venons de créer
import { generateInvestmentContract } from "@/lib/pdfGenerator"; 

interface DocumentsCardProps {
  contracts: any[];
  user: any; // Important : L'objet User complet
}

export default function DocumentsCard({ contracts, user }: DocumentsCardProps) {
  
  const handleDownloadPDF = (contract: any) => {
    // Petit feedback UX
    const toastId = toast.loading("Génération du contrat officiel...");

    try {
        if (!contract) throw new Error("Données manquantes");

        // Action : On lance le générateur PDF
        generateInvestmentContract(user, contract);

        toast.success("Téléchargement lancé !", { id: toastId });

    } catch (error) {
        console.error("Erreur PDF:", error);
        toast.error("Erreur lors de la génération.", { id: toastId });
    }
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
                        // Au clic, on déclenche le PDF
                        onClick={() => handleDownloadPDF(contract)}
                        className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-[#F59E0B]/30 hover:bg-white/[0.05] transition cursor-pointer group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white group-hover:text-[#F59E0B] transition">Contrat_Investissement.pdf</p>
                                <p className="text-[10px] text-slate-500">
                                    Signé le {new Date(contract.signedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center group-hover:bg-[#F59E0B] group-hover:text-black transition">
                            <Download className="w-4 h-4 text-slate-500 group-hover:text-black" />
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center p-6 border border-dashed border-white/10 rounded-xl">
                    <p className="text-xs text-slate-500 italic">Aucun contrat signé.</p>
                </div>
            )}
            
            {/* Emplacement pour le Relevé Fiscal (Futur) */}
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
