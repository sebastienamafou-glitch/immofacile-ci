"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  TrendingUp, Wallet, ArrowUpRight, Plus, 
  Building2, FileText, LayoutDashboard, LogOut, PieChart, Loader2,
  ShieldCheck, Landmark, Lock, CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api"; 

// --- TYPES ---
interface Investment {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    packName?: string; 
}

interface Stats {
    totalInvested: number;
    activeCount: number;
}

// ✅ WIDGET KYC INVESTISSEUR (Mis à jour pour gérer le statut REJECTED/PENDING)
const InvestorKycWidget = ({ kycStatus, isVerified }: { kycStatus: string, isVerified: boolean }) => {
  
  // CAS 1 : VÉRIFIÉ
  if (isVerified) return (
    <div className="mb-10 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
       <div className="flex items-center gap-4">
          <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500 border border-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
              <h4 className="text-white font-bold text-sm">Investisseur Accrédité</h4>
              <p className="text-amber-500/80 text-xs font-medium">Conformité AML/CFT validée. Plafonds débloqués.</p>
          </div>
       </div>
       <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-widest px-3 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <CheckCircle2 className="w-4 h-4" /> Vérifié
       </div>
    </div>
  );

  // CAS 2 : EN ATTENTE
  if (kycStatus === 'PENDING') return (
    <div className="mb-10 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex items-center gap-4 animate-pulse">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <div>
            <h4 className="text-white font-bold text-sm">Analyse en cours...</h4>
            <p className="text-blue-400 text-xs">Vos documents sont en cours de traitement par notre équipe conformité.</p>
        </div>
    </div>
  );

  // CAS 3 : NON VÉRIFIÉ ou REJETÉ (Affiche le widget d'appel à l'action)
  return (
    <div className="mb-10 p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/30 border border-amber-500/30 shadow-2xl relative overflow-hidden group transition hover:border-amber-500/50">
        {/* Background Décoratif Or */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center border w-8 h-8 bg-white/5 rounded-lg backdrop-blur-md border-white/10">
                        <Landmark className="w-4 h-4 text-amber-200" />
                    </div>
                    {kycStatus === 'REJECTED' ? (
                         <span className="bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                            ⚠️ Dossier Refusé
                         </span>
                    ) : (
                        <span className="bg-amber-950/50 border border-amber-500/30 text-amber-200 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Conformité Financière
                        </span>
                    )}
                </div>
                <h4 className="text-xl font-black text-white tracking-tight mb-2">
                    {kycStatus === 'REJECTED' ? "Mise à jour requise" : "Débloquez votre potentiel d'investissement"}
                </h4>
                <p className="text-xs font-medium leading-relaxed text-slate-400 max-w-lg">
                    {kycStatus === 'REJECTED' 
                        ? "Votre dossier a été refusé. Veuillez consulter les motifs et soumettre de nouveaux documents."
                        : "En vertu des réglementations anti-blanchiment (AML), nous devons valider l'origine de vos fonds pour autoriser les transactions supérieures à 1.000.000 FCFA."
                    }
                </p>
            </div>

            <Link href="/dashboard/investor/kyc" className="relative z-10 block w-full md:w-auto">
                <button className="w-full md:w-auto bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black py-4 px-8 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                    <ShieldCheck className="w-4 h-4" />
                    {kycStatus === 'REJECTED' ? "Corriger mon dossier" : "Valider mon dossier AML"}
                </button>
            </Link>
        </div>
    </div>
  );
};

export default function InvestorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalInvested: 0, activeCount: 0 });
  const [investments, setInvestments] = useState<Investment[]>([]);
  
  // ✅ ÉTAT UTILISATEUR COMPLET (Email + Status KYC)
  const [user, setUser] = useState<{ 
      email: string; 
      isVerified: boolean; 
      kycStatus: string; // NONE, PENDING, REJECTED, VERIFIED
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
        try {
            // 1. Récupération User Local (Pré-chargement rapide)
            const storedUser = localStorage.getItem("immouser");
            
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                // On initialise avec le cache local en attendant l'API
                setUser({
                    email: parsed.email,
                    isVerified: parsed.isVerified || false,
                    kycStatus: parsed.kycStatus || "NONE"
                });
                
                // 2. Appel API (Source de vérité)
                const res = await api.get('/investor/dashboard', {
                    headers: { 'x-user-email': parsed.email }
                }); 
                
                if (res.data.success) {
                    setStats(res.data.stats);
                    setInvestments(res.data.investments);
                    
                    // ✅ MISE À JOUR CRITIQUE AVEC LES DONNÉES FRAÎCHES DE L'API
                    if (res.data.kyc) {
                        const updatedUser = {
                            email: parsed.email,
                            isVerified: res.data.kyc.isVerified,
                            kycStatus: res.data.kyc.status
                        };
                        setUser(updatedUser);
                        
                        // Optionnel : Mettre à jour le localStorage pour la prochaine fois
                        const mergedStorage = { ...parsed, ...res.data.kyc, isVerified: res.data.kyc.isVerified, kycStatus: res.data.kyc.status, kycRejectionReason: res.data.kyc.rejectionReason };
                        localStorage.setItem("immouser", JSON.stringify(mergedStorage));
                    }
                }
            } else {
                router.push('/login');
            }
        } catch (error: any) {
            console.error("Dashboard Load Error", error);
            if (error.response?.status === 401) router.push('/login');
            else toast.error("Erreur de connexion aux marchés.");
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-sm font-mono text-slate-500 uppercase tracking-widest">Accès Salle des Marchés...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-200 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-800 p-6 hidden lg:flex flex-col fixed h-full bg-[#0B1120] z-10">
        <div className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center font-black text-black shadow-lg shadow-amber-500/20">I</div>
            <span className="text-xl font-bold text-white tracking-tight">INVEST<span className="text-amber-500">.CLUB</span></span>
        </div>
        
        <nav className="space-y-2 flex-1">
            <Link href="/investor/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 border border-white/5 text-white shadow-lg font-bold text-sm">
                <LayoutDashboard className="w-4 h-4 text-amber-500" /> Vue d'ensemble
            </Link>
            <Link href="/investor/opportunities" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition font-medium text-sm">
                <PieChart className="w-4 h-4" /> Opportunités
            </Link>
        </nav>

        <button onClick={() => router.push('/login')} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-white hover:bg-red-500/10 rounded-xl transition font-bold text-sm border border-transparent hover:border-red-500/20">
            <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6 lg:p-10 lg:ml-64">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight uppercase">Mon Portefeuille</h1>
                <p className="text-slate-400 mt-1 text-sm font-medium">Suivez la performance de vos actifs immobiliers.</p>
            </div>
            <Link href="/investor/opportunities">
                <Button className="bg-amber-600 hover:bg-amber-500 text-black font-bold h-12 px-6 rounded-xl shadow-lg shadow-amber-900/30 transition-transform active:scale-95 uppercase text-xs tracking-widest">
                    <Plus className="w-4 h-4 mr-2" /> Explorer les projets
                </Button>
            </Link>
        </header>

        {/* ✅ WIDGET KYC INVESTISSEUR CONNECTÉ À L'API */}
        {user && <InvestorKycWidget isVerified={user.isVerified} kycStatus={user.kycStatus} />}

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg border border-blue-500/20"><Wallet className="w-5 h-5" /></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Investi</span>
                    </div>
                    <p className="text-3xl font-black text-white">{stats.totalInvested.toLocaleString()} <span className="text-lg text-slate-500 font-medium">FCFA</span></p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg border border-purple-500/20"><TrendingUp className="w-5 h-5" /></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contrats Actifs</span>
                    </div>
                    <p className="text-3xl font-black text-purple-400">{stats.activeCount}</p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                 <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-500/10 text-green-500 rounded-lg border border-green-500/20"><ArrowUpRight className="w-5 h-5" /></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ROI Estimé</span>
                    </div>
                    <p className="text-3xl font-black text-green-400">~ 12.5 %</p>
                </CardContent>
            </Card>
        </div>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-500" /> Mes Contrats
        </h2>

        <div className="space-y-4">
            {investments.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                    <p className="text-slate-500 font-medium">Vous n'avez aucun investissement actif.</p>
                    <Link href="/investor/opportunities" className="text-amber-500 text-sm font-bold hover:underline mt-2 inline-block">
                        Voir les opportunités disponibles &rarr;
                    </Link>
                </div>
            ) : (
                investments.map(inv => (
                    <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/30 transition duration-300 group relative overflow-hidden shadow-lg">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                            
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center font-black text-amber-500 text-xl border border-slate-800 group-hover:border-amber-500/50 transition-colors">
                                    {(inv.packName || "I").charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg group-hover:text-amber-400 transition-colors">{inv.packName || "Contrat Investisseur"}</h3>
                                    <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                                        Signé le {new Date(inv.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-8 text-center w-full md:w-auto justify-between md:justify-end items-center">
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Montant Investi</p>
                                    <p className="font-bold text-white text-lg">{inv.amount.toLocaleString()} F</p>
                                </div>
                                <div>
                                    <Badge className={`border-0 px-3 py-1 ${inv.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                        {inv.status === 'ACTIVE' ? 'ACTIF' : inv.status}
                                    </Badge>
                                </div>
                                <Link href={`/investor/contract/${inv.id}`}>
                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl">
                                        <FileText className="w-5 h-5" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

      </main>
    </div>
  );
}
