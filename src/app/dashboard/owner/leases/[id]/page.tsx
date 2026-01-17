"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  ArrowLeft, Download, Ban, User, MapPin, Calendar, 
  Wallet, CheckCircle, FileText, Loader2, 
  AlertTriangle, PenTool 
} from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LeaseDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState<any>(null);

  const fetchLease = async () => {
    // Récupération user (simulation auth)
    const stored = localStorage.getItem("immouser");
    if (!stored) return;
    const user = JSON.parse(stored);

    try {
       const res = await api.get(`/owner/leases/${id}`, {
          headers: { 'x-user-email': user.email }
       });
       if (res.data.success) {
         setLease(res.data.lease);
       }
    } catch (error) {
       toast.error("Impossible de charger les détails du bail.");
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => { fetchLease(); }, [id]);

  // Action : Résilier
  const handleTerminate = async () => {
    const result = await Swal.fire({
        title: 'Êtes-vous sûr ?',
        text: "La résiliation est irréversible. Le bien sera remis sur le marché.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#1e293b',
        confirmButtonText: 'Oui, résilier',
        background: '#0f172a', color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            await api.put(`/owner/leases/${id}`, { action: 'TERMINATE' });
            toast.success("Bail résilié.");
            fetchLease();
        } catch (e) {
            toast.error("Erreur technique.");
        }
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B1120]"><Loader2 className="w-10 h-10 animate-spin text-[#F59E0B]" /></div>;
  if (!lease) return <div className="text-white text-center mt-20">Bail introuvable.</div>;

  const isSigned = lease.signatureStatus === 'SIGNED_TENANT' || lease.signatureStatus === 'COMPLETED';

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 font-sans">
        
        {/* HEADER DE NAVIGATION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <Link href="/dashboard/owner/leases" className="flex items-center text-slate-400 hover:text-white gap-2 transition group">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Retour aux contrats
            </Link>
            
            <div className="flex flex-wrap gap-3">
                {/* 1. BOUTON TÉLÉCHARGEMENT (Lien corrigé) */}
                <a 
                    href={`/api/owner/leases/${id}/download`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition text-sm font-bold ${isSigned ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'}`}
                >
                    {isSigned ? <CheckCircle className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    {isSigned ? "CONTRAT SIGNÉ (PDF)" : "Télécharger PDF"}
                </a>

                {/* 2. ACTIONS PROPRIÉTAIRE */}
                {lease.isActive && (
                    <>
                        <button 
                            onClick={handleTerminate}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl transition text-sm font-bold"
                        >
                            <Ban className="w-4 h-4" /> Résilier
                        </button>

                        <Link 
                            href={`/dashboard/owner/leases/${id}/notice`}
                            className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/20 rounded-xl transition text-sm font-bold"
                        >
                            <AlertTriangle className="w-4 h-4" /> Mise en Demeure
                        </Link>
                    </>
                )}
            </div>
        </div>

        {/* STATUS BAR SI SIGNÉ */}
        {isSigned && (
            <div className="mb-8 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400">
                <PenTool className="w-5 h-5" />
                <span className="font-bold">Ce document a été signé électroniquement par le locataire le {new Date(lease.signatures?.[0]?.signedAt || lease.updatedAt).toLocaleDateString()}.</span>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE : DÉTAILS */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* CARTE BIEN */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <FileText className="text-[#F59E0B]" /> Termes du Contrat
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Bien loué</p>
                                <p className="font-bold text-lg text-white">{lease.property.title}</p>
                                <div className="flex items-center gap-1 text-slate-400 text-sm">
                                    <MapPin className="w-3 h-3"/> {lease.property.address}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-bold">Statut</p>
                                {lease.isActive ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">ACTIF</Badge>
                                ) : (
                                    <Badge className="bg-slate-700 text-slate-400">CLÔTURÉ</Badge>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Date d'effet</p>
                                <div className="flex items-center gap-2 text-white font-mono">
                                    <Calendar className="w-4 h-4 text-[#F59E0B]" /> 
                                    {new Date(lease.startDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Loyer Mensuel</p>
                                <div className="flex items-center gap-2 text-white font-mono font-bold">
                                    <Wallet className="w-4 h-4 text-emerald-500" /> 
                                    {lease.monthlyRent.toLocaleString()} F
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* HISTORIQUE */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Paiements de Loyer</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {lease.payments?.length > 0 ? lease.payments.map((pay: any) => (
                                <div key={pay.id} className="flex justify-between items-center p-3 hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4"/>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white">Loyer reçu</p>
                                            <p className="text-xs text-slate-500">{new Date(pay.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-white">{pay.amount.toLocaleString()} F</span>
                                </div>
                            )) : (
                                <p className="text-slate-500 text-sm italic text-center py-4">Aucun paiement enregistré pour ce bail.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* COLONNE DROITE : LOCATAIRE */}
            <div>
                <Card className="bg-slate-900 border-slate-800 sticky top-6">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <User className="text-blue-500" /> Locataire
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-700">
                            <span className="text-2xl font-black text-slate-500">{lease.tenant?.name?.charAt(0)}</span>
                        </div>
                        <h3 className="font-bold text-xl text-white mb-1">{lease.tenant?.name}</h3>
                        <div className="flex justify-center gap-2 mb-6">
                             <Badge variant="secondary" className="bg-blue-500/10 text-blue-400">LOCATAIRE VÉRIFIÉ</Badge>
                        </div>
                        
                        <div className="space-y-3 text-left bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <div>
                                <p className="text-[10px] uppercase text-slate-500 font-bold">Email</p>
                                <p className="text-sm text-slate-300 truncate">{lease.tenant?.email}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-slate-500 font-bold">Téléphone</p>
                                <p className="text-sm text-slate-300 font-mono">{lease.tenant?.phone}</p>
                            </div>
                        </div>

                        <button className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition text-sm border border-slate-700">
                            Envoyer un message
                        </button>
                    </CardContent>
                </Card>
            </div>

        </div>
    </div>
  );
}
