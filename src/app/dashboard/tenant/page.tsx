"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Wallet, History, AlertTriangle, Clock, ShieldCheck, 
  ChevronRight, Receipt, Download, Calendar, MapPin, 
  Loader2, FolderOpen, UploadCloud, FileText, CheckCircle2, ArrowUpRight
} from "lucide-react";
import { api, getReceiptData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Link from "next/link";

export default function TenantDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // États d'action
  const [isPaying, setIsPaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stored = localStorage.getItem("immouser");
        if (!stored) { router.push("/login"); return; }
        const user = JSON.parse(stored);

        const res = await api.get('/tenant/dashboard', {
            headers: { 'x-user-email': user.email }
        });

        if (res.data.success) {
            setData(res.data);
        } else {
             // Si l'API renvoie une erreur mais pas 401, on affiche l'erreur
             setError(true);
        }
      } catch (err: any) {
        console.error("Erreur dashboard", err);
        if (err.response?.status === 401) router.push("/login");
        else setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  // --- ACTIONS ---
  const handlePayRent = async () => {
      toast.info("Module de paiement en cours d'intégration");
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      toast.info("Upload en cours d'intégration");
  };

  const handleDownloadReceipt = async (id: string) => {
      toast.info("Génération du reçu...");
  };

  // --- RENDUS CONDITIONNELS ---

  if (loading) return <div className="min-h-screen bg-[#060B18] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>;

  if (error) return (
    <div className="min-h-screen bg-[#060B18] flex flex-col items-center justify-center text-slate-400 gap-4">
      <AlertTriangle className="w-12 h-12 text-red-500" />
      <p>Erreur lors du chargement des données.</p>
      <Button onClick={() => window.location.reload()} variant="outline">Réessayer</Button>
    </div>
  );

  // --- CAS 1 : NOUVEAU USER (Sans dossier ni bail) ---
  if (!data?.lease) {
    return (
        <main className="min-h-screen bg-[#060B18] flex flex-col items-center justify-center p-6 text-center text-slate-300">
            <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 max-w-2xl shadow-2xl">
                <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500">
                    <FolderOpen className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-black text-white mb-4">Bienvenue sur votre Espace Locataire</h1>
                <p className="text-lg text-slate-400 mb-8">
                    Vous n'avez pas encore de dossier actif. Commencez par explorer nos biens et déposez votre candidature en un clic.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link href="/properties">
                        <Button className="bg-orange-500 hover:bg-orange-600 text-black font-bold h-12 px-8 rounded-xl">
                            Voir les annonces
                        </Button>
                    </Link>
                </div>
            </div>
        </main>
    );
  }

  // --- CAS 2 : CANDIDATURE EN ATTENTE (Bail PENDING) ---
  // C'est ici que vous allez atterrir après avoir déposé le dossier !
  if (data.lease.status === 'PENDING') {
      return (
        <main className="min-h-screen bg-[#060B18] p-6 flex flex-col items-center justify-center text-slate-300 font-sans">
            <div className="bg-slate-900 border border-blue-500/20 p-8 rounded-[2rem] max-w-xl w-full relative overflow-hidden shadow-2xl">
                {/* Décoration de fond */}
                <div className="absolute top-0 right-0 p-4 opacity-5"><FileText size={150}/></div>
                
                <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 inline-block border border-blue-500/20">
                    Dossier en cours d'analyse
                </span>
                
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Candidature transmise ! 🚀</h1>
                <p className="text-slate-400 mb-8 text-lg">
                    Vous avez postulé pour le bien <br/>
                    <strong className="text-white">{data.lease.property?.title || "Logement"}</strong>.
                </p>

                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-5 bg-slate-950/50 rounded-2xl border border-emerald-500/20 shadow-lg">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                             <CheckCircle2 className="w-6 h-6"/>
                        </div>
                        <div>
                             <p className="text-white font-bold">Profil transmis au propriétaire</p>
                             <p className="text-xs text-slate-500">Votre dossier est complet et visible.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-5 bg-slate-950/30 rounded-2xl border border-white/5 opacity-70">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                             <Clock className="w-6 h-6"/>
                        </div>
                        <div>
                             <p className="text-slate-300 font-bold">En attente de validation</p>
                             <p className="text-xs text-slate-600">Le propriétaire étudie votre profil.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-white/5 text-center">
                    <p className="text-xs text-slate-500 font-medium">Vous recevrez une notification (Email/SMS) dès que le statut changera.</p>
                    <Link href="/properties">
                        <Button variant="link" className="text-orange-500 mt-2">Retourner aux annonces</Button>
                    </Link>
                </div>
            </div>
        </main>
      );
  }

  // --- CAS 3 : LOCATAIRE ACTIF (Affichage Standard) ---
  const { lease, user, incidents, payments } = data;
  const property = lease?.property;
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
            {property ? `${property.title} — ${property.commune}` : "Logement Actuel"}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-900/40 border border-white/5 p-3 rounded-[2rem] pr-8 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-center border w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Solde Wallet</p>
            <p className="text-sm font-black tracking-tight text-white uppercase italic">
                {user.walletBalance?.toLocaleString() || 0} FCFA 
            </p>
          </div>
        </div>
      </div>

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
                          <p className="text-[10px] text-slate-500 font-bold">Tickets ouverts.</p>
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
                        {payments?.filter((p: any) => p.status === 'SUCCESS' || p.status === 'PAID').length > 0 ? (
                            payments.filter((p: any) => p.status === 'SUCCESS' || p.status === 'PAID').map((payment: any, idx: number) => (
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
      
    </main>
  );
}
