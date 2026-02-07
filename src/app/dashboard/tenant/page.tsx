"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Wallet, FolderOpen, UploadCloud, Loader2, 
  MapPin, AlertTriangle, FileText, CheckCircle2, Clock, Download
} from "lucide-react";
import { toast } from "sonner";

// ✅ IMPORTS SÉCURISÉS
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantDashboardResponse } from "@/lib/types/tenant";

// ✅ IMPORTS COMPOSANTS UI
import RentPaymentCard from "@/components/dashboard/tenant/RentPaymentCard";
import PaymentHistory from "@/components/dashboard/tenant/PaymentHistory";

export default function TenantDashboard() {
  // 1. ÉTAT TYPÉ STRICTEMENT (Plus de 'any')
  const [data, setData] = useState<TenantDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const router = useRouter();

  // 2. CHARGEMENT SÉCURISÉ
  useEffect(() => {
    const fetchData = async () => {
      try {
        const stored = localStorage.getItem("immouser");
        if (!stored) { router.push("/login"); return; }
        const user = JSON.parse(stored);

        // L'API utilise maintenant le header pour la sécurité
        const res = await api.get('/tenant/dashboard', {
            headers: { 'x-user-email': user.email }
        });

        if (res.data.success) {
            setData(res.data);
        } else {
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

  // Remplacer la fonction handleFileUpload existante par celle-ci :
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sécurité : Vérification basique côté client
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation taille (5MB) pour éviter d'envoyer une requête inutile
    if (file.size > 5 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (Max 5MB)");
        return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "kyc"); // On marque le type pour le dossier sécurisé

    try {
        // L'instance 'api' gère déjà les cookies de session (withCredentials)
        await api.post('/upload', formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        
        toast.success("Document chiffré et transmis ! 🔒");
    } catch (err) {
        console.error("Upload error", err);
        toast.error("Erreur lors de l'envoi du document.");
    } finally {
        setIsUploading(false);
    }
};

  // --- ÉTAT : CHARGEMENT ---
  if (loading) return (
    <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 w-12 h-12" />
    </div>
  );

  // --- ÉTAT : ERREUR ---
  if (error || !data) return (
    <div className="min-h-screen bg-[#060B18] flex flex-col items-center justify-center text-slate-400 gap-4">
      <div className="bg-red-500/10 p-4 rounded-full">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>
      <p className="font-medium">Impossible de charger vos données locatives.</p>
      <Button onClick={() => window.location.reload()} variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
        Réessayer
      </Button>
    </div>
  );

  // --- ÉTAT : NOUVEAU VISITEUR (Sans dossier) ---
  if (!data.lease) {
    return (
        <main className="min-h-screen bg-[#060B18] flex flex-col items-center justify-center p-6 text-center text-slate-300">
            <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-orange-500/20">
                    <FolderOpen className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Espace Locataire</h1>
                <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                    Vous n'avez pas encore de dossier de location actif.<br/>
                    Parcourez nos biens exclusifs et déposez votre dossier en 2 minutes.
                </p>
                <Link href="/properties">
                    <Button className="bg-white text-black hover:bg-slate-200 font-black h-14 px-10 rounded-2xl text-lg transition-transform active:scale-95">
                        Trouver un logement
                    </Button>
                </Link>
            </div>
        </main>
    );
  }

  // --- ÉTAT : CANDIDATURE EN ATTENTE (PENDING) ---
  if (data.lease.status === 'PENDING') {
      return (
        <main className="min-h-screen bg-[#060B18] p-6 flex flex-col items-center justify-center text-slate-300 font-sans">
            <div className="bg-slate-900 border border-blue-500/20 p-8 rounded-[2rem] max-w-xl w-full relative overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><FileText size={200}/></div>
                
                <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block border border-blue-500/20">
                    Dossier en analyse
                </span>
                
                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Candidature transmise 🚀</h1>
                <p className="text-slate-400 mb-8">
                    Pour le bien : <strong className="text-white">{data.lease.property.title}</strong>
                </p>

                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-5 bg-slate-950/50 rounded-2xl border border-emerald-500/20 shadow-lg">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                             <CheckCircle2 className="w-5 h-5"/>
                        </div>
                        <div>
                             <p className="text-white font-bold text-sm">Dossier Complet</p>
                             <p className="text-[10px] text-slate-500">Transmis au propriétaire.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-5 bg-slate-950/30 rounded-2xl border border-white/5 opacity-70">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                             <Clock className="w-5 h-5"/>
                        </div>
                        <div>
                             <p className="text-slate-300 font-bold text-sm">Validation en cours</p>
                             <p className="text-[10px] text-slate-600">Réponse sous 24-48h.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-white/5 text-center">
                    <Link href="/properties">
                        <Button variant="link" className="text-orange-500 text-xs">Retourner aux annonces</Button>
                    </Link>
                </div>
            </div>
        </main>
      );
  }

  // --- ÉTAT : LOCATAIRE ACTIF (DASHBOARD COMPLET) ---
  const { lease, user, incidents } = data;
  const property = lease.property; // TypeScript sait que property existe ici
  const displayName = user.name ? user.name.split(' ')[0] : "Locataire";

  return (
    <main className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 pb-20 relative overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -ml-48 -mb-48 pointer-events-none"></div>

      {/* HEADER */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white">
            Bonjour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">{displayName}</span> 👋
          </h1>
          <p className="mt-2 font-medium text-slate-500 flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-600" />
            {property.title} — {property.commune}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-900/40 border border-white/5 p-3 rounded-[2rem] pr-8 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-center border w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Mon Portefeuille</p>
            <p className="text-sm font-black tracking-tight text-white uppercase italic">
                {user.walletBalance.toLocaleString()} FCFA 
            </p>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="relative z-10 grid grid-cols-1 gap-8 xl:grid-cols-3 animate-in slide-in-from-bottom-8 duration-700 delay-100">
        
        {/* COLONNE GAUCHE (Paiement & Infos) */}
        <div className="space-y-8 xl:col-span-2">
          
          {/* 1. CARTE DE PAIEMENT (Nouveau Composant) */}
          <RentPaymentCard lease={lease} userPhone={user.phone} />

          {/* 2. ACTIONS RAPIDES */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            
            {/* Carte Contrat */}
            <Card className="bg-[#0F172A]/50 border-white/5 rounded-[2rem] backdrop-blur-xl hover:bg-[#0F172A] transition cursor-pointer group">
                <CardHeader className="pb-4">
                    <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-blue-400 transition">
                        <FileText className="w-4 h-4 text-blue-500" /> Documents
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col">
                        <span className="text-lg font-black text-white">Mon Bail Numérique</span>
                        <span className="mt-1 text-xs text-slate-500">Signé le {new Date(lease.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Button 
                        onClick={() => router.push('/dashboard/tenant/contract')}
                        variant="ghost" 
                        className="mt-2 text-xs font-bold w-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl justify-between"
                    >
                        Télécharger PDF <Download className="w-3 h-3" />
                    </Button>
                </CardContent>
            </Card>

            {/* Carte Maintenance */}
            <Card className="bg-[#0F172A]/50 border-white/5 rounded-[2rem] backdrop-blur-xl hover:bg-[#0F172A] transition">
                <CardHeader className="pb-4">
                    <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" /> Maintenance
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <div className="flex items-center gap-4 p-4 border rounded-2xl bg-orange-500/5 border-orange-500/10 text-left">
                        <div className="flex items-center justify-center text-xl font-black text-orange-500 w-12 h-12 bg-orange-500/20 rounded-xl">
                          {incidents.length}
                        </div>
                        <div>
                          <p className="text-xs font-black tracking-tighter text-white uppercase italic">Incidents</p>
                          <p className="text-[10px] text-slate-500 font-bold">Signalements actifs.</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => router.push('/dashboard/tenant/incidents')}
                        className="w-full py-6 text-[10px] font-black tracking-widest text-slate-900 uppercase transition-all bg-slate-100 shadow-lg hover:bg-white rounded-xl"
                    >
                        Signaler un problème
                    </Button>
                </CardContent>
            </Card>
          </div>
        </div>

        {/* COLONNE DROITE (Historique & Upload) */}
        <aside className="space-y-8">
            
            {/* 3. HISTORIQUE (Nouveau Composant) */}
            <PaymentHistory payments={lease.payments} />

            {/* 4. ZONE UPLOAD */}
            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl relative overflow-hidden group shadow-indigo-500/20 transition hover:scale-[1.02]">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                
                <div className="relative z-10 flex justify-between items-start mb-6">
                    <div className="flex items-center justify-center border w-12 h-12 bg-white/10 rounded-2xl backdrop-blur-md border-white/10">
                        <FolderOpen className="w-6 h-6 text-indigo-200" />
                    </div>
                    <span className="bg-indigo-900/50 border border-indigo-400/30 text-indigo-200 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                        Administratif
                    </span>
                </div>

                <h4 className="relative z-10 text-2xl font-black tracking-tight italic uppercase mb-2">Mon Dossier</h4>
                <p className="relative z-10 text-xs font-medium leading-relaxed mb-8 text-indigo-100/80">
                    Mettez à jour vos justificatifs (Assurance, Revenus) pour maintenir votre score locataire.
                </p>

                <div className="relative z-10">
                    <input type="file" id="doc-upload" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    <label 
                        htmlFor="doc-upload"
                        className={`flex items-center justify-center w-full bg-white text-indigo-900 hover:bg-indigo-50 font-black py-5 rounded-xl text-[10px] uppercase tracking-widest shadow-xl cursor-pointer transition-all active:scale-95 gap-2 ${isUploading ? 'opacity-80 cursor-wait' : ''}`}
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4" />}
                        {isUploading ? "Envoi sécurisé..." : "Ajouter un document"}
                    </label>
                </div>
            </div>
        </aside>
      </div> 
      
    </main>
  );
}
