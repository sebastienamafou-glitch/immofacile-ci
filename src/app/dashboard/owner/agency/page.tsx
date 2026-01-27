"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Building2, Link as LinkIcon, Phone, Mail, CheckCircle2, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function MyAgencyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null); // { hasAgency, agency, stats }
  
  // État formulaire liaison
  const [agencyCode, setAgencyCode] = useState("");
  const [linking, setLinking] = useState(false);

  // 1. FETCH DONNÉES (ZERO TRUST)
  const fetchData = async () => {
    try {
        // ✅ APPEL SÉCURISÉ : Cookie Only
        const res = await api.get('/owner/agency');
        if (res.data) {
            setData(res.data);
        }
    } catch (err: any) {
        console.error(err);
        if (err.response?.status === 401) router.push('/login');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [router]);

  // 2. ACTION LIER
  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinking(true);
    
    try {
        // ✅ APPEL POST SÉCURISÉ
        const res = await api.post('/owner/agency', { agencyCode });
        
        if (res.data.success) {
            toast.success(`Compte lié avec succès à ${res.data.agencyName}`);
            fetchData(); // Recharger la page pour afficher le dashboard agence
        }
    } catch (error: any) {
        toast.error(error.response?.data?.error || "Code invalide ou introuvable");
    } finally {
        setLinking(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0B1120]"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>;

  // --- CAS 1 : PAS D'AGENCE ---
  if (!data?.hasAgency) {
    return (
        <div className="min-h-screen bg-[#0B1120] text-white flex items-center justify-center p-6">
             <div className="bg-slate-900 border border-dashed border-slate-700 rounded-[2rem] p-10 flex flex-col items-center max-w-lg w-full shadow-2xl">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-8 border border-slate-700">
                    <Building2 className="w-10 h-10 text-slate-500" />
                </div>
                <h1 className="text-3xl font-black text-white mb-4 text-center">Déléguez votre gestion</h1>
                <p className="text-slate-400 mb-10 text-center text-sm leading-relaxed">
                    Vous travaillez avec une agence partenaire <strong>ImmoFacile</strong> ? 
                    Entrez leur code unique pour synchroniser vos biens et suivre vos revenus en temps réel.
                </p>

                <form onSubmit={handleLink} className="w-full space-y-4">
                    <div className="relative">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <Input 
                            placeholder="Code Agence (ex: ORPI-ABJ)" 
                            className="bg-black/40 border-slate-600 h-14 pl-12 text-center text-lg uppercase tracking-widest font-bold text-white placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:border-orange-500 transition-colors"
                            value={agencyCode}
                            onChange={e => setAgencyCode(e.target.value)}
                        />
                    </div>
                    <Button 
                        disabled={linking || !agencyCode}
                        className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl text-lg shadow-lg shadow-orange-500/20"
                    >
                        {linking ? <Loader2 className="animate-spin" /> : "LIER MON COMPTE"}
                    </Button>
                </form>
             </div>
        </div>
    );
  }

  // --- CAS 2 : AGENCE CONNECTÉE ---
  const { agency, stats } = data;

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 pb-24">
        
        {/* HEADER AGENCE */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-[2rem] p-8 mb-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Building2 size={200} />
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center p-2 shadow-xl shrink-0">
                    {/* Logo Agence ou Placeholder */}
                    {agency.logoUrl ? (
                        <Image src={agency.logoUrl} alt={agency.name} width={80} height={80} className="object-contain" />
                    ) : (
                        <span className="text-2xl font-black text-slate-900">{agency.name.substring(0,2).toUpperCase()}</span>
                    )}
                </div>
                
                <div className="text-center md:text-left flex-1">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <h1 className="text-3xl font-black text-white">{agency.name}</h1>
                        <CheckCircle2 className="text-blue-500 w-6 h-6" />
                    </div>
                    <p className="text-slate-400 font-medium">Gestionnaire Principal Certifié</p>
                    
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
                        <Button variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:bg-white/5 h-10 px-6 rounded-lg font-bold">
                            <Phone className="w-4 h-4 mr-2" /> Contacter
                        </Button>
                        <Button variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:bg-white/5 h-10 px-6 rounded-lg font-bold">
                            <Mail className="w-4 h-4 mr-2" /> Message
                        </Button>
                    </div>
                </div>

                <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 text-center min-w-[200px]">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2">Performance Agence</p>
                    <p className="text-3xl font-black text-emerald-500 tracking-tight">
                        {(stats?.totalRevenue || 0).toLocaleString()} <span className="text-lg text-emerald-700">F</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Générés pour vous</p>
                </div>
            </div>
        </div>

        {/* INFO GESTION */}
        <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-white/5 p-8 rounded-[2rem] hover:border-orange-500/20 transition-colors">
                <h3 className="font-bold text-white text-xl mb-4 flex items-center gap-2">
                    <Building2 className="text-orange-500 w-5 h-5"/> Biens sous gestion <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md text-xs ml-2">{stats?.managedListings || 0}</span>
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Ces biens sont pilotés par votre agence. Vous conservez la visibilité sur les encaissements et les incidents, mais la modification (prix, description) est restreinte pour garantir la cohérence contractuelle.
                </p>
            </div>

            <div className="bg-slate-900 border border-white/5 p-8 rounded-[2rem] hover:border-blue-500/20 transition-colors">
                <h3 className="font-bold text-white text-xl mb-4 flex items-center gap-2">
                     <CheckCircle2 className="text-blue-500 w-5 h-5"/> Contrat de Mandat
                </h3>
                <div className="space-y-4">
                    <div className="flex justify-between text-sm py-2 border-b border-white/5">
                        <span className="text-slate-400 font-medium">Type de mandat</span>
                        <span className="text-white font-bold uppercase tracking-wide">Exclusif</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-white/5">
                        <span className="text-slate-400 font-medium">Commission Agence</span>
                        <span className="text-white font-bold">15%</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-white/5">
                        <span className="text-slate-400 font-medium">Statut</span>
                        <span className="text-emerald-500 font-black uppercase flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Actif
                        </span>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="mt-16 text-center">
            <button className="text-xs text-red-500 hover:text-red-400 flex items-center justify-center gap-2 mx-auto opacity-50 hover:opacity-100 transition font-bold uppercase tracking-widest">
                <LogOut size={14} /> Révoquer le mandat (Contacter le support)
            </button>
        </div>

    </div>
  );
}
