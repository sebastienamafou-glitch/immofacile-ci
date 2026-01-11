"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FileText, Download, Search, Shield, 
  FileCheck, FileClock, ArrowLeft, Loader2,
  FolderOpen, Receipt, Eye, AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner"; // ✅ Ajout pour les notifications

// --- Interfaces pour la sécurité des données ---
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
      const res = await api.get('/tenant/documents'); // <-- Nouvelle route ciblée
      if (res.data.success) {
        setData(res.data);
      } else {
        toast.error("Impossible de récupérer vos documents.");
      }
    } catch (error) {
      console.error("Erreur documents:", error);
      toast.error("Erreur de connexion serveur.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fonction sécurisée pour voir un document (simulé ou réel)
  const handleViewDocument = (docId: number | string, type: 'STATIC' | 'DYNAMIC') => {
    if (type === 'STATIC') {
        toast.info("Document de démonstration", {
            description: "Le téléchargement sera activé une fois le fichier hébergé."
        });
    } else {
        router.push(`/dashboard/tenant/documents/${docId}`);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
    </div>
  );

  // ✅ Sécurisation des accès aux données (évite le crash si data est null)
  const lease = data?.lease;
  // On accepte 'PAID' et 'SUCCESS' comme statuts valides
  const payments = data?.payments?.filter((p) => p.status === 'PAID' || p.status === 'SUCCESS') || [];
  
  const staticDocs = [
    { id: 1, title: "Règlement de copropriété", type: "Règlement", date: "01/01/2024", size: "2.4 MB" },
    { id: 2, title: "Guide du locataire", type: "Guide", date: "01/01/2024", size: "1.1 MB" },
  ];

  return (
    <main className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 relative font-sans">
      
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="mb-10">
            <Link href="/dashboard/tenant" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white mb-4 group transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Retour Dashboard
            </Link>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                        Mes Documents <FolderOpen className="w-8 h-8 text-blue-500" />
                    </h1>
                    <p className="text-slate-500 text-sm mt-2 font-medium">
                        Retrouvez ici l'ensemble de vos pièces contractuelles et comptables.
                    </p>
                </div>
                
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Rechercher un document..." 
                        className="pl-10 pr-4 py-3 bg-[#0F172A] border border-white/5 rounded-xl text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all w-full md:w-64 placeholder:text-slate-600"
                    />
                </div>
            </div>
        </div>

        {/* SECTION 1 : LE BAIL */}
        {lease ? (
            <div className="mb-12">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" /> Document Officiel
                </h2>
                <div className="bg-gradient-to-r from-slate-900 to-[#0F172A] border border-white/5 p-8 rounded-[2rem] relative overflow-hidden group hover:border-blue-500/30 transition-all cursor-default">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px] rounded-full group-hover:bg-blue-600/10 transition-all"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                        <div className="flex items-start gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                                <FileCheck className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Contrat de Bail Résidentiel</h3>
                                <p className="text-slate-400 text-sm mt-1">
                                    Signé le {new Date(lease.startDate).toLocaleDateString()} • <span className="text-emerald-500 font-bold">Actif</span>
                                </p>
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] text-slate-400 font-mono border border-white/5">
                                        REF: {lease.id.substring(0, 8)}...
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={() => router.push(`/dashboard/tenant/contract/${lease.id}`)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-3"
                        >
                            <FileText className="w-4 h-4" /> Consulter le contrat
                        </Button>
                    </div>
                </div>
            </div>
        ) : (
            // ✅ État vide si pas de bail
            <div className="mb-12 p-8 rounded-3xl bg-slate-900/50 border border-white/5 text-center">
                <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-bold">Aucun contrat de bail actif associé à ce compte.</p>
            </div>
        )}

        {/* SECTION 2 : QUITTANCES & AUTRES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Colonne Gauche : Quittances */}
            <Card className="bg-[#0F172A] border-white/5 rounded-[2rem] overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-6">
                    <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-orange-500" /> Dernières Quittances
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                        {payments.length > 0 ? payments.slice(0, 5).map((pay) => (
                            <div key={pay.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
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
                                <Button 
                                    variant="ghost"
                                    onClick={() => router.push(`/dashboard/tenant/payments/${pay.id}`)}
                                    className="text-slate-400 hover:text-white hover:bg-white/10"
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        )) : (
                            <div className="p-10 text-center text-slate-500 text-sm font-medium italic">
                                Aucune quittance disponible.
                            </div>
                        )}
                    </div>
                    {payments.length > 0 && (
                        <div className="p-4 border-t border-white/5">
                            <Button 
                                onClick={() => router.push('/dashboard/tenant/payments')}
                                variant="ghost" 
                                className="w-full text-xs font-black uppercase tracking-widest text-slate-500 hover:text-orange-500 hover:bg-transparent"
                            >
                                Voir tout l'historique
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Colonne Droite : Autres Documents */}
            <Card className="bg-[#0F172A] border-white/5 rounded-[2rem] overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-6">
                    <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <FileClock className="w-4 h-4 text-blue-400" /> Documents Annexes
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                        
                        {/* Documents Statiques Fiabilisés */}
                        {staticDocs.map((doc) => (
                            <div key={doc.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">{doc.title}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                                            {doc.type} • {doc.size}
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    onClick={() => handleViewDocument(doc.id, 'STATIC')}
                                    variant="ghost"
                                    className="text-slate-400 hover:text-white hover:bg-white/10"
                                >
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
