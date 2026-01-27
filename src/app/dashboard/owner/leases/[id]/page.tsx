"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation"; // ✅ useParams préféré
import { api } from "@/lib/api";
import { 
  ArrowLeft, Download, Ban, User, MapPin, Calendar, 
  Wallet, CheckCircle, FileText, Loader2, 
  AlertTriangle 
} from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// IMPORT TYPES OFFICIELS
import { Lease, Property, User as PrismaUser, Payment } from "@prisma/client";

// TYPAGE STRICT (Relations incluses)
type LeaseDetail = Lease & {
    property: Property;
    tenant: PrismaUser;
    payments: Payment[];
};

export default function LeaseDetailPage() {
  const params = useParams(); // Hook sécurisé
  const id = params?.id as string;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState<LeaseDetail | null>(null);

  // 1. CHARGEMENT
  const fetchLease = async () => {
    try {
       // ✅ APPEL ZERO TRUST (Cookie Only)
       const res = await api.get(`/owner/leases/${id}`);
       
       if (res.data.success) {
         setLease(res.data.lease);
       } else {
         throw new Error(res.data.error || "Erreur API");
       }
    } catch (error: any) {
       console.error(error);
       // Redirection si non autorisé
       if (error.response?.status === 401 || error.response?.status === 404) {
           router.push("/dashboard/owner/leases");
       } else {
           toast.error("Impossible de charger le bail.");
       }
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => { 
      if(id) fetchLease(); 
  }, [id]);

  // 2. ACTION : RÉSILIER
  const handleTerminate = async () => {
    const result = await Swal.fire({
        title: 'Confirmer la résiliation ?',
        text: "Cette action clôturera le contrat immédiatement. Le bien redeviendra disponible.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#1e293b',
        confirmButtonText: 'Oui, résilier le bail',
        cancelButtonText: 'Annuler',
        background: '#0f172a', color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            // ✅ APPEL SÉCURISÉ
            await api.put(`/owner/leases/${id}`, { action: 'TERMINATE' });
            
            toast.success("Bail résilié avec succès.");
            fetchLease(); // Rafraîchir les données
        } catch (e) {
            toast.error("Erreur lors de la résiliation.");
        }
    }
  };

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center bg-[#0B1120] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#F59E0B]" />
        <p className="text-slate-500 font-mono text-sm">Récupération du dossier...</p>
    </div>
  );
  
  if (!lease) return null;

  const isSigned = lease.signatureStatus === 'SIGNED_TENANT' || lease.signatureStatus === 'COMPLETED';

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 font-sans pb-20">
        
        {/* HEADER NAVIGATION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <Link href="/dashboard/owner/leases" className="flex items-center text-slate-400 hover:text-white gap-2 transition group text-sm font-bold">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Retour aux contrats
            </Link>
            
            <div className="flex flex-wrap gap-3">
                {/* Bouton Juridique (Mise en demeure) */}
                {lease.isActive && (
                    <Link 
                        href={`/dashboard/owner/leases/${lease.id}/notice`}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-600/20 rounded-xl transition text-sm font-bold"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Mise en Demeure
                    </Link>
                )}

                {/* Bouton PDF */}
                <a 
                    href={`/api/owner/leases/${id}/download`} // Supposant que cette route PDF existe ou existera
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition text-sm font-bold ${
                        isSigned 
                        ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                    }`}
                >
                    {isSigned ? <CheckCircle className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    {isSigned ? "Contrat Signé (PDF)" : "Télécharger PDF"}
                </a>

                {/* Bouton Résilier */}
                {lease.isActive && (
                    <button 
                        onClick={handleTerminate}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-950/30 text-slate-400 hover:text-red-500 border border-slate-700 hover:border-red-500/30 rounded-xl transition text-sm font-bold"
                    >
                        <Ban className="w-4 h-4" /> Clôturer
                    </button>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* GAUCHE : DÉTAILS CONTRAT */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* CARTE PRINCIPALE */}
                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white text-lg">
                            <FileText className="text-[#F59E0B]" /> Termes du Contrat
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        
                        {/* Statut & Bien */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-950 rounded-xl border border-slate-800 gap-4">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Bien Immobilier</p>
                                <p className="font-bold text-lg text-white">{lease.property.title}</p>
                                <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                                    <MapPin className="w-3 h-3 text-[#F59E0B]"/> {lease.property.address}, {lease.property.commune}
                                </div>
                            </div>
                            <div className="text-right">
                                {lease.isActive ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 px-3 py-1">ACTIF</Badge>
                                ) : (
                                    <Badge variant="destructive" className="bg-slate-700 text-slate-300 hover:bg-slate-700">RÉSILIÉ</Badge>
                                )}
                            </div>
                        </div>

                        {/* Infos Financières */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-[#0B1120] rounded-xl border border-slate-800">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Date d'entrée</p>
                                <div className="flex items-center gap-2 text-white font-mono">
                                    <Calendar className="w-4 h-4 text-[#F59E0B]" /> 
                                    {new Date(lease.startDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="p-4 bg-[#0B1120] rounded-xl border border-slate-800">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Loyer Mensuel</p>
                                <div className="flex items-center gap-2 text-white font-mono font-bold text-lg">
                                    <Wallet className="w-4 h-4 text-emerald-500" /> 
                                    {lease.monthlyRent.toLocaleString()} F
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* HISTORIQUE DES PAIEMENTS */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center justify-between">
                            <span>Historique Financier</span>
                            <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded-full">12 derniers mois</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {lease.payments && lease.payments.length > 0 ? lease.payments.map((pay) => (
                                <div key={pay.id} className="flex justify-between items-center p-3 hover:bg-[#0B1120] rounded-lg transition group border-b border-slate-800 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                            <CheckCircle className="w-4 h-4"/>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white">Loyer perçu</p>
                                            <p className="text-xs text-slate-500">{new Date(pay.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-400">+{pay.amount.toLocaleString()} F</span>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-600">
                                        <Wallet className="w-6 h-6"/>
                                    </div>
                                    <p className="text-slate-500 text-sm">Aucun paiement enregistré pour ce bail.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* DROITE : PROFIL LOCATAIRE */}
            <div>
                <Card className="bg-slate-900 border-slate-800 sticky top-6 shadow-xl">
                    <div className="h-24 bg-gradient-to-b from-blue-600/20 to-slate-900"></div>
                    <div className="px-6 relative -mt-12 text-center">
                        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border-4 border-slate-900 overflow-hidden shadow-2xl">
                             {lease.tenant?.image ? (
                                <img src={lease.tenant.image} alt="Avatar" className="w-full h-full object-cover" />
                             ) : (
                                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-3xl font-black text-slate-600">
                                    {lease.tenant?.name?.charAt(0)}
                                </div>
                             )}
                        </div>
                        <h3 className="font-bold text-xl text-white mt-3">{lease.tenant?.name}</h3>
                        <Badge variant="secondary" className="mt-2 bg-blue-500/10 text-blue-400 border-blue-500/20">LOCATAIRE EN TITRE</Badge>
                    </div>

                    <CardContent className="mt-6 space-y-4">
                        <div className="space-y-1 bg-[#0B1120] p-3 rounded-xl border border-slate-800">
                            <p className="text-[10px] uppercase text-slate-500 font-bold">Email</p>
                            <p className="text-sm text-white truncate font-medium">{lease.tenant?.email}</p>
                        </div>
                        <div className="space-y-1 bg-[#0B1120] p-3 rounded-xl border border-slate-800">
                            <p className="text-[10px] uppercase text-slate-500 font-bold">Téléphone</p>
                            <p className="text-sm text-white font-mono font-medium">{lease.tenant?.phone || "Non renseigné"}</p>
                        </div>

                        <Link href={`/dashboard/owner/tenants/${lease.tenant.id}`} className="block">
                            <button className="w-full py-3 mt-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700">
                                Voir le profil complet
                            </button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
