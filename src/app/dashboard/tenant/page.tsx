"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Wallet, History, AlertTriangle,
  Clock, ArrowUpRight, ShieldCheck, ChevronRight,
  Receipt, Download, Calendar, MapPin, 
  Loader2, FolderOpen, UploadCloud
} from "lucide-react";
import { api, getReceiptData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// --- Interfaces conformes au Schema Prisma V5 ---
interface User {
  id: string;
  name: string;
  isVerified?: boolean;
  walletBalance: number;
  email: string; 
  phone?: string; // Ajouté pour conformité CinetPay
}

interface Owner {
  name: string;
}

interface Property {
  title: string;
  address: string;
  commune: string; 
  owner?: Owner;
}

interface Lease {
  id: string;
  monthlyRent: number; 
  depositAmount: number;
  status: string; 
  property: Property;
}

interface Payment {
  id: string;
  date: string;
  amount: number; 
  status: string; 
  type?: "LOYER" | "FRAIS_DOSSIER" | "DEPOSIT" | "PENALTY";
}

interface Incident {
  id: string;
  title: string;
  status: string; 
}

interface TenantDashboardData {
  user: User;
  lease: Lease;
  payments: Payment[];
  incidents: Incident[];
}

export default function TenantDashboard() {
  const [data, setData] = useState<TenantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const getStoredUser = () => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("immouser");
    if (!stored) return null;
    return JSON.parse(stored);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = getStoredUser();
        if (!currentUser?.email) {
            router.push("/login");
            return;
        }

        const res = await api.get('/tenant/dashboard', {
            headers: { 'x-user-email': currentUser.email }
        });

        if (res.data.success) {
            setData(res.data);
        } else {
            setError(true);
        }
      } catch (err: any) {
        console.error("Erreur chargement dashboard:", err);
        if (err.response?.status === 401) {
            router.push("/login");
        } else {
            setError(true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  // --- ACTIONS DE PAIEMENT SÉCURISÉES (Email + Phone + Name pour CinetPay) ---

  const handlePayFees = async () => {
    if (!data?.lease?.id || !data?.user) return;
    const currentUser = getStoredUser();
    if (!currentUser) return;

    setIsPaying(true);
    try {
        const res = await api.post('/payment/fees', 
            { 
              leaseId: data.lease.id,
              email: currentUser.email,
              phone: data.user.phone || currentUser.phone || "0000000000",
              name: data.user.name
            },
            { headers: { 'x-user-email': currentUser.email } } 
        );
        if (res.data.success && res.data.payment_url) window.location.href = res.data.payment_url;
        else toast.error("Échec initialisation paiement.");
    } catch (error) { toast.error("Erreur de connexion."); } 
    finally { setIsPaying(false); }
  };

  const handlePayRent = async () => {
    if (!data?.lease?.id || !data?.user) return;
    const currentUser = getStoredUser();
    
    // Vérification du téléphone pour CinetPay
    if (!data?.user?.phone && !currentUser?.phone) {
       toast.error("Numéro de téléphone manquant pour le paiement");
       return;
    }

    setIsPaying(true);
    try {
        const res = await api.post('/payment/pay-rent', 
            { 
              leaseId: data.lease.id, 
              amount: data.lease.monthlyRent,
              email: currentUser.email,
              phone: data.user.phone || currentUser.phone || "0000000000",
              name: data.user.name
            },
            { headers: { 'x-user-email': currentUser.email } } 
        );
        if (res.data.success && res.data.payment_url) window.location.href = res.data.payment_url;
    } catch (error) { toast.error("Erreur paiement loyer."); } 
    finally { setIsPaying(false); }
  };

  const handlePayDeposit = async () => {
    if (!data?.lease?.id || !data?.user) return;
    const currentUser = getStoredUser();
    if (!currentUser) return;

    setIsPaying(true);
    try {
        const res = await api.post('/payment/pay-rent', 
            { 
              leaseId: data.lease.id, 
              amount: data.lease.depositAmount, 
              type: 'DEPOSIT',
              email: currentUser.email,
              phone: data.user.phone || currentUser.phone || "0000000000",
              name: data.user.name
            },
            { headers: { 'x-user-email': currentUser.email } } 
        );
        if (res.data.success && res.data.payment_url) window.location.href = res.data.payment_url;
    } catch (error) { toast.error("Erreur paiement caution."); } 
    finally { setIsPaying(false); }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
        const res = await getReceiptData(paymentId);
        if (res.data.success && res.data.pdfUrl) window.open(res.data.pdfUrl, '_blank');
        else toast.info("Génération du reçu en cours...");
    } catch (error) { toast.error("Impossible de récupérer le document."); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const currentUser = getStoredUser();
      if (!currentUser) return;

      if (file.size > 5 * 1024 * 1024) {
          toast.error("Fichier trop volumineux (Max 5Mo)");
          return;
      }

      setIsUploading(true);
      try {
          const formData = new FormData();
          formData.append("file", file);

          const uploadRes = await api.post('/upload', formData, {
              headers: { 
                  "Content-Type": "multipart/form-data",
                  "x-user-email": currentUser.email 
              }
          });

          if (!uploadRes.data.success) throw new Error("Erreur Upload");

          const saveRes = await api.post('/tenant/documents', 
            {
              name: file.name,
              url: uploadRes.data.url,
              type: "OTHER",
              userId: data?.user?.id 
            },
            { headers: { "x-user-email": currentUser.email } }
          );

          if (saveRes.data.success) {
              toast.success("Document sauvegardé");
              window.location.reload(); 
          }
      } catch (error) {
          toast.error("Erreur lors de l'envoi.");
      } finally {
          setIsUploading(false);
          e.target.value = ""; 
      }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
      <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#060B18] flex flex-col items-center justify-center text-slate-400 gap-4">
      <AlertTriangle className="w-12 h-12 text-red-500" />
      <p>Erreur lors du chargement des données ou session expirée.</p>
      <Button onClick={() => window.location.reload()} variant="outline" className="text-white border-slate-700 hover:bg-slate-800">Réessayer</Button>
    </div>
  );

  const { lease, user, incidents, payments } = data;
  const property = lease?.property;
  const pendingFees = payments?.find(p => p.type === 'FRAIS_DOSSIER' && p.status === 'PENDING');
  const pendingDeposit = payments?.find(p => p.type === 'DEPOSIT' && p.status === 'PENDING');
  const pendingRent = payments?.find(p => p.type === 'LOYER' && (p.status === 'PENDING' || p.status === 'UNPAID'));
  const displayName = user?.name ? user.name.split(' ')[0] : "Locataire";

  return (
    <main className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 pb-20 relative overflow-hidden font-sans">
      
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -ml-48 -mb-48 pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white">
            Bonjour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">{displayName}</span> 👋
          </h1>
          <p className="mt-1 font-medium italic text-slate-500">
            {property ? `${property.title} — ${property.commune}` : "Pas de logement actif"}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-900/40 border border-white/5 p-3 rounded-[2rem] pr-8 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-center border w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Solde Wallet</p>
            <p className="text-sm font-black tracking-tight text-white uppercase italic">
                {user.walletBalance?.toLocaleString() || 0} FCFA 
            </p>
          </div>
        </div>
      </div>

      {/* Alerte de Paiement */}
      {(pendingFees || pendingDeposit || pendingRent) && (
        <div className="relative z-20 mb-10 animate-in slide-in-from-top-4 duration-700">
             <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-red-500/40 transition-all shadow-2xl">
                <div className="relative z-10 flex items-center gap-6">
                    <div className="flex items-center justify-center text-white bg-red-500 shadow-lg w-16 h-16 rounded-2xl animate-pulse">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-white">Paiement Requis</h2>
                        <p className="text-sm font-medium text-red-200/80 mt-1">
                            {pendingFees ? "Activation de bail : Frais de dossier en attente." : 
                             pendingDeposit ? "Veuillez régler votre caution locative." : 
                             "Une échéance de loyer est arrivée à terme."}
                        </p>
                        <div className="mt-4">
                            <span className="text-xl font-black text-white">
                                {(pendingFees?.amount || pendingDeposit?.amount || pendingRent?.amount || 0).toLocaleString()} FCFA
                            </span>
                        </div>
                    </div>
                </div>
                <Button 
                    onClick={pendingFees ? handlePayFees : pendingDeposit ? handlePayDeposit : handlePayRent}
                    disabled={isPaying}
                    className="z-10 w-full text-xs font-black tracking-widest text-white uppercase transition-all bg-red-600 shadow-xl border border-red-500/50 hover:bg-red-500 px-10 py-7 rounded-2xl active:scale-95 md:w-auto"
                >
                    {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Payer maintenant"}
                </Button>
            </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="relative z-10 grid grid-cols-1 gap-8 xl:grid-cols-3">
        
        <div className="space-y-8 xl:col-span-2">
          
          {/* Carte Loyer */}
          <Card className="bg-[#0F172A] border-white/5 rounded-[2.5rem] overflow-hidden relative group shadow-2xl">
                <CardContent className="relative z-10 p-8">
                    <div className="flex flex-col gap-8 md:flex-row md:items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                <Clock className="w-4 h-4 text-orange-500" /> Prochaine Échéance
                            </div>
                            <h2 className="text-5xl font-black tracking-tighter text-white flex items-baseline gap-2">
                                {lease?.monthlyRent?.toLocaleString() || 0} 
                                <span className="text-xl font-bold uppercase text-slate-600">CFA</span>
                            </h2>
                            <div className="flex items-center gap-2 mt-4 text-[11px] font-black text-emerald-400 bg-emerald-500/10 w-fit px-4 py-1.5 rounded-full border border-emerald-500/10 uppercase tracking-widest">
                                <Calendar className="w-3.5 h-3.5" /> Avant le 05 du mois
                            </div>
                        </div>
                        <div className="w-full md:w-72">
                            <Button 
                                onClick={handlePayRent}
                                disabled={isPaying}
                                className="w-full text-sm font-black tracking-widest text-white uppercase transition-all shadow-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 h-16 rounded-2xl shadow-orange-500/20"
                            >
                                {isPaying ? <Loader2 className="animate-spin" /> : "Payer le loyer"}
                            </Button>
                        </div>
                    </div>
                    <div className="pt-8 mt-10 border-t border-white/5">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                            <span className="text-slate-500">Occupation du mois en cours</span>
                            <span className="text-orange-500">20%</span>
                        </div>
                        <Progress value={20} className="h-2.5 bg-slate-950 rounded-full" />
                    </div>
                </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Card className="bg-[#0F172A]/50 border-white/5 rounded-[2rem] backdrop-blur-xl">
                <CardHeader className="pb-4">
                    <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-500" /> Mon Logement
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col">
                        <span className="text-lg font-black text-white">{property?.title || "Logement"}</span>
                        <span className="mt-1 text-xs text-slate-500">{property?.address || "Non renseigné"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div>
                            <p className="text-[9px] font-bold text-slate-600 uppercase">Gestionnaire</p>
                            <p className="text-xs font-bold text-slate-300">ImmoFacile</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-600 uppercase">Caution Scellée</p>
                            <p className="text-xs font-bold text-emerald-500">{lease?.depositAmount?.toLocaleString() || 0} F</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => router.push('/dashboard/tenant/contract')}
                        variant="ghost" 
                        className="mt-2 text-xs font-bold transition-all w-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
                    >
                        Accéder à mon contrat <Download className="w-3 h-3 ml-2" />
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-[#0F172A]/50 border-white/5 rounded-[2rem] backdrop-blur-xl">
                <CardHeader className="pb-4">
                    <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" /> Maintenance
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <div className="flex items-center gap-4 p-4 border rounded-2xl bg-orange-500/5 border-orange-500/10 text-left">
                        <div className="flex items-center justify-center text-xl font-black text-orange-500 w-12 h-12 bg-orange-500/20 rounded-xl">
                          {incidents?.length || 0}
                        </div>
                        <div>
                          <p className="text-xs font-black tracking-tighter text-white uppercase italic">Interventions</p>
                          <p className="text-[10px] text-slate-500 font-bold">Tickets de réparation ouverts.</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => router.push('/dashboard/tenant/incidents')}
                        className="w-full py-6 text-[10px] font-black tracking-widest text-slate-900 uppercase transition-all bg-slate-100 shadow-lg hover:bg-white rounded-xl"
                    >
                        Signaler une panne
                    </Button>
                </CardContent>
            </Card>
          </div>
        </div>

        <aside className="space-y-8">
            <Card className="bg-[#0F172A] border-white/5 rounded-[2.5rem] shadow-xl overflow-hidden min-h-[400px]">
                <CardHeader className="flex flex-row items-center justify-between mx-6 px-0 pb-6 border-b border-white/5">
                    <CardTitle className="text-lg font-black text-white italic">Historique</CardTitle>
                    <History className="w-5 h-5 text-slate-600" />
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                        {payments?.filter(p => p.status === 'SUCCESS' || p.status === 'PAID').length > 0 ? (
                            payments.filter(p => p.status === 'SUCCESS' || p.status === 'PAID').map((payment, idx) => (
                                <div key={idx} className="flex items-center justify-between px-8 py-5 transition-all group hover:bg-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center border w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border-emerald-500/10">
                                            <Receipt className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase italic">
                                                {new Date(payment.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                                {payment.type === 'FRAIS_DOSSIER' ? 'Frais de Dossier' : 'Loyer Mensuel'}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDownloadReceipt(payment.id)} className="z-20 p-2 text-slate-500 transition-all rounded-lg bg-white/5 hover:text-orange-500">
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center px-6">
                                <p className="text-sm font-bold italic text-slate-600">Aucune archive disponible</p>
                            </div>
                        )}
                    </div>
                    <div className="p-6">
                        <Button 
                            variant="outline"
                            onClick={() => router.push('/dashboard/tenant/payments')}
                            className="w-full py-6 text-[10px] font-black tracking-widest text-slate-500 uppercase transition-all bg-transparent border-white/5 rounded-xl hover:text-white hover:border-orange-500/50"
                        >
                            Voir tout l'historique <ArrowUpRight className="w-3.5 h-3.5 ml-2" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl relative overflow-hidden group shadow-indigo-500/20">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="relative z-10 flex justify-between items-start mb-6">
                    <div className="flex items-center justify-center border w-12 h-12 bg-white/10 rounded-2xl backdrop-blur-md border-white/10">
                        <FolderOpen className="w-6 h-6 text-indigo-200" />
                    </div>
                    <span className="bg-indigo-900/50 border border-indigo-400/30 text-indigo-200 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                        Documents
                    </span>
                </div>

                <h4 className="relative z-10 text-2xl font-black tracking-tight italic uppercase mb-2">Mon Dossier</h4>
                <p className="relative z-10 text-xs font-medium leading-relaxed mb-8 text-indigo-100/80">
                    Transmettez vos bulletins de salaire et CNI au propriétaire pour finaliser le bail.
                </p>

                <div className="relative z-10">
                    <input type="file" id="doc-upload" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    <label 
                        htmlFor="doc-upload"
                        className={`flex items-center justify-center w-full bg-white text-indigo-900 hover:bg-indigo-50 font-black py-5 rounded-xl text-[10px] uppercase tracking-widest shadow-xl cursor-pointer transition-all active:scale-95 gap-2 ${isUploading ? 'opacity-80' : ''}`}
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4" />}
                        {isUploading ? "Envoi en cours..." : "Ajouter un document"}
                    </label>
                </div>
            </div>
        </aside>
      </div> 

      {/* Footer State */}
      <div className="mt-8 p-6 rounded-[2rem] bg-[#0F172A] border border-white/5 flex items-center justify-between group cursor-pointer hover:border-blue-500/30 transition-all shadow-lg" onClick={() => router.push('/dashboard/tenant/kyc')}>
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${user?.isVerified ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}`}>
                <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs font-black tracking-widest text-slate-500 uppercase">État du Compte</p>
                <p className={`text-sm font-bold transition-colors ${user?.isVerified ? "text-emerald-500" : "text-white group-hover:text-blue-400"}`}>
                   {user?.isVerified ? "Locataire Certifié ImmoFacile" : "Finaliser la vérification d'identité"}
                </p>
            </div>
        </div>
        <div className="flex items-center justify-center transition-all shadow-inner w-10 h-10 rounded-full bg-slate-900 text-slate-500 group-hover:bg-blue-500 group-hover:text-white">
            <ChevronRight className="w-5 h-5" />
        </div>
      </div>
      
    </main>
  );
}
