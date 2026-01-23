"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Building2, Link as LinkIcon, Phone, Mail, CheckCircle2, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function MyAgencyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null); // { hasAgency, agency, stats }
  
  // État formulaire liaison
  const [agencyCode, setAgencyCode] = useState("");
  const [linking, setLinking] = useState(false);

  // 1. FETCH
  const fetchData = async () => {
    try {
        const stored = localStorage.getItem("immouser");
        if (!stored) return;
        
        const res = await fetch('/api/owner/agency', {
            headers: { 'x-user-email': JSON.parse(stored).email }
        });
        const json = await res.json();
        setData(json);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 2. ACTION LIER
  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinking(true);
    try {
        const stored = localStorage.getItem("immouser");
        const res = await fetch('/api/owner/agency', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-user-email': JSON.parse(stored || '{}').email 
            },
            body: JSON.stringify({ agencyCode })
        });
        const json = await res.json();
        
        if (res.ok) {
            toast.success(`Lié avec succès à ${json.agencyName}`);
            fetchData(); // Reload
        } else {
            toast.error(json.error || "Code invalide");
        }
    } catch (error) {
        toast.error("Erreur connexion");
    } finally {
        setLinking(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  // --- CAS 1 : PAS D'AGENCE ---
  if (!data?.hasAgency) {
    return (
        <div className="max-w-2xl mx-auto p-6 pb-24 text-center">
             <div className="bg-slate-900 border border-dashed border-slate-700 rounded-3xl p-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <Building2 className="w-10 h-10 text-slate-500" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">Déléguez votre gestion</h1>
                <p className="text-slate-400 mb-8 max-w-md">
                    Vous travaillez avec une agence partenaire ImmoFacile ? 
                    Entrez leur code unique pour synchroniser vos biens et suivre vos revenus en temps réel.
                </p>

                <form onSubmit={handleLink} className="w-full max-w-sm space-y-4">
                    <div className="relative">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <Input 
                            placeholder="Code Agence (ex: ORPI-ABJ)" 
                            className="bg-black/40 border-slate-600 h-14 pl-12 text-center text-lg uppercase tracking-widest font-bold text-white placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                            value={agencyCode}
                            onChange={e => setAgencyCode(e.target.value)}
                        />
                    </div>
                    <Button 
                        disabled={linking || !agencyCode}
                        className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                    >
                        {linking ? <Loader2 className="animate-spin" /> : "Lier mon compte"}
                    </Button>
                </form>
             </div>
        </div>
    );
  }

  // --- CAS 2 : AGENCE CONNECTÉE ---
  const { agency, stats } = data;

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24">
        
        {/* HEADER AGENCE */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-3xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <Building2 size={200} />
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center p-2 shadow-xl">
                    {/* Logo Agence ou Placeholder */}
                    {agency.logoUrl ? (
                        <Image src={agency.logoUrl} alt={agency.name} width={80} height={80} className="object-contain" />
                    ) : (
                        <span className="text-2xl font-black text-slate-900">{agency.name.substring(0,2)}</span>
                    )}
                </div>
                
                <div className="text-center md:text-left flex-1">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <h1 className="text-3xl font-black text-white">{agency.name}</h1>
                        <CheckCircle2 className="text-blue-500 w-6 h-6" />
                    </div>
                    <p className="text-slate-400">Gestionnaire Principal Certifié</p>
                    
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                        <Button variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:bg-white/5">
                            <Phone className="w-4 h-4 mr-2" /> Contacter
                        </Button>
                        <Button variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:bg-white/5">
                            <Mail className="w-4 h-4 mr-2" /> Message
                        </Button>
                    </div>
                </div>

                <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Performance Agence</p>
                    <p className="text-2xl font-black text-emerald-500">
                        {stats.totalRevenue.toLocaleString()} F
                    </p>
                    <p className="text-[10px] text-slate-400">Générés pour vous</p>
                </div>
            </div>
        </div>

        {/* INFO GESTION */}
        <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
                <h3 className="font-bold text-white mb-4">Biens sous gestion ({stats.managedListings})</h3>
                <p className="text-sm text-slate-400">
                    Ces biens sont pilotés par votre agence. Vous pouvez voir les réservations mais la modification est restreinte pour garantir la cohérence des tarifs.
                </p>
                {/* Liste des biens rapide... */}
            </div>

            <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
                <h3 className="font-bold text-white mb-4">Contrat de Mandat</h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm py-2 border-b border-white/5">
                        <span className="text-slate-400">Type de mandat</span>
                        <span className="text-white font-medium">Exclusif</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-white/5">
                        <span className="text-slate-400">Commission Agence</span>
                        <span className="text-white font-medium">15%</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-white/5">
                        <span className="text-slate-400">Statut</span>
                        <span className="text-emerald-500 font-bold">Actif</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="mt-12 text-center">
            <button className="text-xs text-red-500 hover:text-red-400 flex items-center justify-center gap-1 mx-auto opacity-50 hover:opacity-100 transition">
                <LogOut size={12} /> Révoquer le mandat (Contacter le support)
            </button>
        </div>

    </div>
  );
}
