"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Loader2, 
  ShieldCheck, 
  MapPin, 
  Building2, 
  CheckCircle2, 
  Scale,
  PenTool,
  Eye,
  FileText,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LeaseContract {
  id: string;
  startDate: string;
  monthlyRent: number;
  depositAmount: number;
  signatureStatus: "PENDING" | "SIGNED_TENANT" | "SIGNED_OWNER" | "COMPLETED";
  documentHash?: string;
  updatedAt: string;
  property: {
    title: string;
    address: string;
    commune: string;
    description?: string;
    owner: {
      name: string;
      email: string;
      phone?: string;
    }
  }
}

export default function TenantContractDashboard() {
  const [lease, setLease] = useState<LeaseContract | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. CHARGEMENT
  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUser = localStorage.getItem("immouser");
        if (!storedUser) { router.push("/login"); return; }
        const currentUser = JSON.parse(storedUser);
        setUser(currentUser);

        const res = await api.get('/tenant/dashboard', {
            headers: { 'x-user-email': currentUser.email }
        });

        if (res.data.success && res.data.lease) {
            setLease(res.data.lease);
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  // 2. NAVIGATION VERS LA PAGE OFFICIELLE
  const goToOfficialContract = () => {
    if (!lease) return;
    // Redirection vers la page dynamique [id] que nous avons créée précédemment
    router.push(`/dashboard/tenant/contract/${lease.id}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 w-12 h-12"/>
    </div>
  );

  if (!lease) return (
    <div className="min-h-screen bg-[#060B18] text-white flex flex-col items-center justify-center p-8 text-center">
        <FileText className="w-16 h-16 text-slate-700 mb-6" />
        <h2 className="text-2xl font-bold">Aucun contrat actif</h2>
        <Button onClick={() => router.push('/dashboard/tenant')} className="mt-6 bg-slate-800">Retour</Button>
    </div>
  );

  const isSigned = lease.signatureStatus !== 'PENDING';

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 font-sans">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                    <ShieldCheck className={`w-8 h-8 ${isSigned ? 'text-emerald-500' : 'text-orange-500'}`} /> 
                    <span>Gestion du Contrat</span>
                </h1>
                <div className="mt-2 flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${isSigned ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                        {isSigned ? 'Bail Signé & Certifié' : 'Signature Requise'}
                    </span>
                    <span className="text-slate-600 text-xs font-mono">ID: {lease.id.substring(0,8)}</span>
                </div>
            </div>
            
            {/* LE BOUTON D'ACTION PRINCIPAL (Redirige maintenant vers la page détaillée) */}
            {isSigned ? (
                <Button 
                    onClick={goToOfficialContract} 
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 h-14 rounded-2xl gap-2 shadow-xl transition-all"
                >
                    <Eye className="w-5 h-5" /> CONSULTER & TÉLÉCHARGER
                </Button>
            ) : (
                <Button 
                    onClick={goToOfficialContract} 
                    className="bg-orange-600 hover:bg-orange-500 text-white font-black px-8 h-14 rounded-2xl gap-2 shadow-xl animate-pulse"
                >
                    <PenTool className="w-5 h-5" /> ALLER À LA SIGNATURE
                </Button>
            )}
        </div>

        {/* RESTE DU DASHBOARD (Info Cartes) */}
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
                
                {isSigned && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[1.5rem] flex items-center gap-5">
                        <div className="bg-emerald-500/20 p-3 rounded-xl">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-bold text-sm">Contrat validé juridiquement</p>
                            <p className="text-xs text-slate-500 font-mono mt-1 break-all">Empreinte : {lease.documentHash}</p>
                        </div>
                    </div>
                )}

                <div className="bg-[#0F172A] border border-white/5 rounded-[2rem] p-8">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-500"/> Détails de la propriété
                    </h3>
                    <h2 className="text-2xl font-bold text-white mb-2">{lease.property.title}</h2>
                    <p className="text-slate-400 flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4" /> {lease.property.address}, {lease.property.commune}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0F172A] border border-white/5 p-6 rounded-2xl">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Loyer Mensuel</p>
                        <p className="text-2xl font-black text-emerald-500">{lease.monthlyRent?.toLocaleString()} <span className="text-xs">FCFA</span></p>
                    </div>
                    <div className="bg-[#0F172A] border border-white/5 p-6 rounded-2xl">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Entrée en vigueur</p>
                        <p className="text-xl font-bold text-white">{new Date(lease.startDate).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-[#0F172A] border border-white/5 rounded-[2rem] p-8">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500"/> Parties au contrat
                    </h3>
                    
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold">B</div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Bailleur</p>
                                <p className="text-white font-bold text-sm">{lease.property.owner.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white">L</div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Locataire (Vous)</p>
                                <p className="text-white font-bold text-sm">{user?.name}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 rounded-[2rem] p-8">
                    <Scale className="w-8 h-8 text-slate-400 mb-4" />
                    <h4 className="text-white font-bold mb-2">Conformité Légale</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Ce document constitue un titre exécutoire conformément au Code de la Construction et de l'Habitat. La signature électronique est certifiée et horodatée.
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
}
