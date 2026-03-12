"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { FileText, ShieldAlert, Receipt, FileSignature, ChevronDown, Mail, Share2, Printer, Eye } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const DownloadRentReceipt = dynamic(() => import('@/components/pdf/DownloadRentReceipt'), {
  ssr: false,
  loading: () => (
    <button className="flex-1 bg-slate-800 text-slate-500 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-wait">
       ...
    </button>
  )
});

// ✅ DTO STRICT : Sécurisation des paiements optionnels
export interface DashboardDocumentProperty {
    title: string;
    address: string;
    leases: {
        id?: string;
        startDate?: string | Date;
        tenant: {
            name: string | null;
            email: string | null;
        } | null;
        payments?: { date: Date | string; amount: number; id: string }[]; // Optionnel
    }[];
}

export default function DocumentsList({ properties }: { properties: DashboardDocumentProperty[] }) {
  
  const leases = properties?.flatMap(p => 
    (p.leases || []).map((l) => ({
        ...l, 
        propertyTitle: p.title,
        propertyAddress: p.address,
        tenantName: l.tenant?.name || "Locataire Inconnu",
        tenantEmail: l.tenant?.email
    }))
  ) || [];

  const [expandedLeaseId, setExpandedLeaseId] = useState<string | null>(null);

  const toggleLease = (id: string) => {
    setExpandedLeaseId(expandedLeaseId === id ? null : id);
  };

  const handleSendEmail = (docName: string) => {
    toast.success("Document envoyé 📧", {
        description: `${docName} a été envoyé par mail au locataire.`
    });
  };

  if (leases.length === 0) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center mt-8 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-700">
                <FileText className="text-slate-600 w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Aucun document</h3>
            <p className="text-slate-500 max-w-sm mx-auto text-sm">
                Dès que vous ajouterez un locataire, ses contrats et quittances apparaîtront ici automatiquement.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="flex items-center justify-between">
            <div>
                <h3 className="font-black text-2xl text-white flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                    Hub Administratif
                </h3>
                <p className="text-slate-500 text-sm font-medium mt-1 ml-14">
                    Gérez et signez vos documents légaux en conformité avec la loi.
                </p>
            </div>
        </div>

        <div className="grid gap-6">
            {leases.map((lease, index) => {
                const uniqueKey = lease.id || `lease-${index}`;
                const isExpanded = expandedLeaseId === uniqueKey;
                const payments = lease.payments || [];
                const latestPayment = payments.length > 0 ? payments[payments.length - 1] : null;

                const signedDate = lease.startDate 
                    ? new Date(lease.startDate).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) 
                    : "En attente";

                return (
                    <div key={uniqueKey} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden transition-all hover:border-slate-700 shadow-lg group/card">
                        
                        <div 
                            onClick={() => toggleLease(uniqueKey)}
                            className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-900 hover:from-slate-800/50 transition duration-300"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black border transition-colors duration-300 ${isExpanded ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    {lease.tenantName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg">{lease.tenantName}</h4>
                                    <p className="text-xs text-slate-500 font-mono uppercase tracking-wide">{lease.propertyTitle}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="hidden md:block text-right">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Documents</p>
                                    <p className="text-white font-bold">{1 + (latestPayment ? 1 : 0)} disponibles</p>
                                </div>
                                <div className={`p-2 rounded-full border transition-all duration-300 ${isExpanded ? 'bg-white text-black border-white rotate-180' : 'bg-transparent text-slate-500 border-slate-700'}`}>
                                    <ChevronDown className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-slate-800 bg-slate-950/50"
                                >
                                    <div className="p-6 grid md:grid-cols-3 gap-4">
                                        
                                        <div className="bg-[#0B1120] p-5 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition group relative overflow-hidden flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                                                    <FileSignature className="w-6 h-6" />
                                                </div>
                                                <span className="text-[9px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded shadow-lg shadow-blue-500/20">OFFICIEL</span>
                                            </div>
                                            
                                            <h5 className="font-bold text-white mb-1 relative z-10">Contrat de Bail</h5>
                                            <p className="text-xs text-slate-500 mb-6 relative z-10">Signé le : {signedDate}</p>

                                            <div className="flex gap-2 mt-auto relative z-10">
                                                <Link href={`/dashboard/contract/${lease.id || ''}`} className="flex-1 bg-white hover:bg-slate-200 text-black text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition active:scale-95">
                                                    <Eye className="w-3.5 h-3.5" /> Ouvrir
                                                </Link>
                                                <button onClick={() => handleSendEmail('Contrat de Bail')} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 hover:text-white transition">
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {latestPayment ? (
                                            <div className="bg-[#0B1120] p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition group relative overflow-hidden flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-4 relative z-10">
                                                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                                                        <Receipt className="w-6 h-6" />
                                                    </div>
                                                </div>
                                                
                                                <h5 className="font-bold text-white mb-1 relative z-10">Quittance de Loyer</h5>
                                                <p className="text-xs text-slate-500 mb-6 relative z-10">Dernier paiement : {new Date(latestPayment.date).toLocaleDateString('fr-FR')}</p>

                                                <div className="flex gap-2 mt-auto relative z-10">
                                                    <DownloadRentReceipt 
                                                        payment={latestPayment as any} 
                                                        lease={lease as any} 
                                                        tenant={{ name: lease.tenantName, email: lease.tenantEmail } as any} 
                                                        property={{ title: lease.propertyTitle, address: lease.propertyAddress } as any} 
                                                        owner={{ name: "Moi" } as any}
                                                    />
                                                    <button onClick={() => handleSendEmail('Quittance')} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 hover:text-white transition">
                                                        <Mail className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800/60 border-dashed flex flex-col items-center justify-center text-center opacity-70 h-full">
                                                <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mb-3">
                                                    <Receipt className="w-5 h-5 text-slate-600" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-400">Aucune quittance</p>
                                                <p className="text-[10px] text-slate-600 mt-1">En attente de paiement</p>
                                            </div>
                                        )}

                                        <div className="bg-[#0B1120] p-5 rounded-2xl border border-slate-800 hover:border-red-500/50 transition group relative overflow-hidden flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20">
                                                    <ShieldAlert className="w-6 h-6" />
                                                </div>
                                            </div>
                                            
                                            <h5 className="font-bold text-white mb-1 relative z-10">Mise en Demeure</h5>
                                            <p className="text-xs text-slate-500 mb-6 relative z-10">Outil juridique en cas d'impayés.</p>

                                            <div className="flex gap-2 mt-auto relative z-10">
                                                <button className="flex-1 bg-slate-800 hover:bg-red-500/10 hover:text-red-500 text-slate-400 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition border border-slate-700">
                                                    <Printer className="w-3.5 h-3.5" /> Générer
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    </div>
  );
}
