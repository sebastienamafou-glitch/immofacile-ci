"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  FileText, Download, Eye, ShieldAlert, Receipt, FileSignature, 
  ChevronDown, Mail, Share2, Printer
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function DocumentsList({ properties }: { properties: any[] }) {
  
  // 1. APLATISSEMENT SÉCURISÉ
  const leases = properties?.flatMap(p => 
    (p.leases || []).map((l: any) => ({
        ...l, 
        property: p, // On lie la propriété au bail
        // On s'assure que le locataire existe, sinon objet vide pour éviter crash
        tenant: l.tenant || { name: "Locataire Inconnu" } 
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center mt-8">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <FileText className="text-slate-600 w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Aucun document</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
                Dès que vous ajouterez un locataire, ses contrats et quittances apparaîtront ici automatiquement.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-8 mt-12">
        
        {/* HEADER SECTION */}
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
            <div className="hidden md:block">
                <span className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Signature Électronique Active
                </span>
            </div>
        </div>

        {/* LISTE DES DOSSIERS LOCATAIRES */}
        <div className="grid gap-6">
            {leases.map((lease: any) => {
                const isExpanded = expandedLeaseId === lease.id;
                const payments = lease.payments || [];
                const latestPayment = payments.length > 0 ? payments[payments.length - 1] : null;

                // 2. CORRECTION AFFICHAGE NOM & PROPRIÉTÉ
                const tenantName = lease.tenant?.name || "Locataire Inconnu";
                const propertyTitle = lease.property?.title || "Propriété Inconnue";

                // 3. CORRECTION DATE INVALIDE
                // On vérifie si lease.startDate existe, sinon on met une valeur par défaut
                const signedDate = lease.startDate 
                    ? new Date(lease.startDate).toLocaleDateString('fr-FR') 
                    : "En attente de signature";

                return (
                    <div key={lease.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden transition-all hover:border-slate-700 shadow-lg">
                        
                        {/* BANDEAU RÉSUMÉ (Clickable) */}
                        <div 
                            onClick={() => toggleLease(lease.id)}
                            className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-900 hover:from-slate-800/50 hover:to-slate-900 transition"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black border ${isExpanded ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    {tenantName.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg">{tenantName}</h4>
                                    <p className="text-xs text-slate-500 font-mono uppercase">{propertyTitle}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="hidden md:block text-right">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Documents</p>
                                    <p className="text-white font-bold">{1 + (latestPayment ? 1 : 0)} disponibles</p>
                                </div>
                                <div className={`p-2 rounded-full border transition ${isExpanded ? 'bg-white text-black border-white rotate-180' : 'bg-transparent text-slate-500 border-slate-700'}`}>
                                    <ChevronDown className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        {/* ZONE DÉPLIABLE (DOCUMENTS) */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-slate-800 bg-slate-950/30"
                                >
                                    <div className="p-6 grid md:grid-cols-3 gap-4">
                                        
                                        {/* CARTE : CONTRAT DE BAIL */}
                                        <div className="bg-[#0B1120] p-5 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition"><FileSignature className="w-20 h-20 text-blue-500"/></div>
                                            
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                                                    <FileSignature className="w-6 h-6" />
                                                </div>
                                                <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-1 rounded">OFFICIEL</span>
                                            </div>
                                            
                                            <h5 className="font-bold text-white mb-1">Contrat de Bail</h5>
                                            {/* ✅ DATE CORRIGÉE */}
                                            <p className="text-xs text-slate-500 mb-6">Signé le : {signedDate}</p>

                                            <div className="flex gap-2 mt-auto">
                                                {/* On redirige vers une page de visualisation (à créer plus tard) */}
                                                <Link href={`/contract/${lease.id}`} className="flex-1 bg-white hover:bg-slate-200 text-black text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition">
                                                    <Eye className="w-3 h-3" /> Ouvrir
                                                </Link>
                                                <button onClick={() => handleSendEmail('Contrat de Bail')} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700">
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* CARTE : QUITTANCE (Si dispo) */}
                                        {latestPayment ? (
                                            <div className="bg-[#0B1120] p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition"><Receipt className="w-20 h-20 text-emerald-500"/></div>
                                                
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                                                        <Receipt className="w-6 h-6" />
                                                    </div>
                                                </div>
                                                
                                                <h5 className="font-bold text-white mb-1">Quittance de Loyer</h5>
                                                <p className="text-xs text-slate-500 mb-6">Dernier paiement : {new Date(latestPayment.date).toLocaleDateString()}</p>

                                                <div className="flex gap-2 mt-auto">
                                                    <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20">
                                                        <Download className="w-3 h-3" /> Télécharger
                                                    </button>
                                                    <button onClick={() => handleSendEmail('Quittance')} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700">
                                                        <Mail className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 border-dashed flex flex-col items-center justify-center text-center opacity-50">
                                                <Receipt className="w-8 h-8 text-slate-600 mb-2" />
                                                <p className="text-xs font-bold text-slate-500">Aucune quittance</p>
                                                <p className="text-[10px] text-slate-600">En attente de paiement</p>
                                            </div>
                                        )}

                                        {/* CARTE : CONTENTIEUX (Mise en demeure) */}
                                        <div className="bg-[#0B1120] p-5 rounded-2xl border border-slate-800 hover:border-red-500/50 transition group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition"><ShieldAlert className="w-20 h-20 text-red-500"/></div>
                                            
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20">
                                                    <ShieldAlert className="w-6 h-6" />
                                                </div>
                                            </div>
                                            
                                            <h5 className="font-bold text-white mb-1">Mise en Demeure</h5>
                                            <p className="text-xs text-slate-500 mb-6">Document juridique pour impayés.</p>

                                            <div className="flex gap-2 mt-auto">
                                                <button className="flex-1 bg-slate-800 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 text-slate-300 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition border border-slate-700">
                                                    <Printer className="w-3 h-3" /> Générer
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
