"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FileText, Download, Shield, FileCheck, FileClock, 
  ArrowLeft, Loader2, FolderOpen, Receipt, Eye, 
  AlertCircle, UploadCloud
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Types
interface Payment {
  id: string;
  date: string;
  amount: number;
  status: string;
  type: string;
}
interface Lease {
  id: string;
  startDate: string;
  status: string;
}
interface DashboardData {
  lease?: Lease;
  payments?: Payment[];
}

export default function TenantDocumentsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      // Remplacez par votre appel réel si disponible
      const res = await api.get('/tenant/dashboard'); 
      if (res.data.success) setData(res.data);
    } catch (error) {
      console.error("Erreur chargement doc:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
    </div>
  );

  const lease = data?.lease;
  const payments = data?.payments?.filter((p) => p.status === 'PAID' || p.status === 'SUCCESS') || [];
  
  const staticDocs = [
    { id: 1, title: "Règlement de copropriété", type: "Règlement", date: "01/01/2024" },
    { id: 2, title: "Guide du locataire", type: "Guide", date: "01/01/2024" },
  ];

  return (
    <main className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 relative font-sans">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* EN-TÊTE AVEC BOUTON D'ACTION */}
        <div className="mb-10">
            <Link href="/dashboard/tenant" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white mb-4 group transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Retour Dashboard
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                        Mes Documents <FolderOpen className="w-8 h-8 text-blue-500" />
                    </h1>
                    <p className="text-slate-500 text-sm mt-2 font-medium">
                        Centralisez vos contrats signés et vos quittances.
                    </p>
                </div>

                {/* 👉 LE BOUTON QUI MÈNE VERS LA PAGE KYC/UPLOAD */}
                <Link href="/dashboard/tenant/kyc">
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 border border-white/10 h-12 px-6 rounded-xl font-bold transition-all hover:scale-105 active:scale-95">
                        <UploadCloud className="w-5 h-5 mr-2" />
                        Gérer mon Dossier (KYC)
                    </Button>
                </Link>
            </div>
        </div>

        {/* SECTION 1 : LE BAIL */}
        {lease ? (
            <div className="mb-12">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" /> Contrat Actif
                </h2>
                <div className="bg-gradient-to-r from-slate-900 to-[#0F172A] border border-white/5 p-8 rounded-[2rem] relative overflow-hidden group hover:border-blue-500/30 transition-all">
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                        <div className="flex items-start gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                <FileCheck className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Bail Résidentiel Numérique</h3>
                                <p className="text-slate-400 text-sm mt-1">
                                    Référence: <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded">{lease.id.substring(0,8)}...</span>
                                </p>
                            </div>
                        </div>
                        {/* Lien vers le téléchargement PDF */}
                        <Button 
                            onClick={() => window.open(`/api/owner/leases/${lease.id}/download`, '_blank')}
                            className="bg-slate-800 hover:bg-slate-700 text-white border border-white/10 px-6 py-6 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-3"
                        >
                            <Download className="w-4 h-4" /> Télécharger PDF
                        </Button>
                    </div>
                </div>
            </div>
        ) : (
            <div className="mb-12 p-8 rounded-3xl bg-slate-900/50 border border-white/5 text-center">
                <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-bold">Aucun contrat de bail actif.</p>
            </div>
        )}

        {/* SECTION 2 : QUITTANCES & AUTRES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quittances */}
            <Card className="bg-[#0F172A] border-white/5 rounded-[2rem] overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-6">
                    <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-orange-500" /> Quittances
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                        {payments.length > 0 ? payments.slice(0, 5).map((pay) => (
                            <div key={pay.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">Quittance de Loyer</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                                            {new Date(pay.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" className="text-slate-400 hover:text-white">
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        )) : (
                            <div className="p-10 text-center text-slate-500 text-sm italic">Aucune quittance disponible.</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Documents Annexes */}
            <Card className="bg-[#0F172A] border-white/5 rounded-[2rem] overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-6">
                    <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <FileClock className="w-4 h-4 text-blue-400" /> Documents Utiles
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                        {staticDocs.map((doc) => (
                            <div key={doc.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">{doc.title}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{doc.type}</p>
                                    </div>
                                </div>
                                <Button onClick={() => router.push(`/dashboard/tenant/documents/${doc.id}`)} variant="ghost" className="text-slate-400 hover:text-white">
                                    <Eye className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
