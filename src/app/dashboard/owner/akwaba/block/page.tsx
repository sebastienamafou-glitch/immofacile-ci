"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CalendarIcon, Lock, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";

// Typage minimal pour la liste
interface ListingOption {
    id: string;
    title: string;
}

export default function BlockDatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [listings, setListings] = useState<ListingOption[]>([]);
  
  const [formData, setFormData] = useState({
    listingId: "",
    startDate: "",
    endDate: "",
    reason: "Maintenance"
  });

  // 1. CHARGER LES ANNONCES DU PROPRIO
  useEffect(() => {
    async function fetchListings() {
      try {
        // ✅ APPEL SÉCURISÉ (Cookie Only)
        // On utilise l'endpoint générique qui liste tous les biens Akwaba du owner
        const res = await api.get('/owner/akwaba/listings'); 
        if (res.data) {
            // Adaptation selon le format de retour (array direct ou {listings: []})
            const list = Array.isArray(res.data) ? res.data : (res.data.listings || []);
            setListings(list);
        }
      } catch (error: any) {
        console.error(error);
        if (error.response?.status === 401) router.push('/login');
        else toast.error("Impossible de charger vos annonces.");
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [router]);

  // 2. SOUMISSION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.listingId) {
        toast.error("Veuillez sélectionner une annonce.");
        return;
    }
    
    // Validation Date Simple
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (start < today) {
        toast.error("Vous ne pouvez pas bloquer des dates passées.");
        return;
    }
    if (start >= end) {
        toast.error("La date de fin doit être après la date de début.");
        return;
    }

    setSubmitting(true);

    try {
        // ✅ POST SÉCURISÉ
        await api.post('/owner/akwaba/block', formData);

        toast.success("Dates bloquées avec succès !");
        
        // Redirection vers le planning pour voir le résultat
        router.push('/dashboard/owner/akwaba'); 

    } catch (error: any) {
        const msg = error.response?.data?.error || "Erreur lors du blocage.";
        toast.error(msg);
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 font-sans">
        
        {/* HEADER */}
        <div className="max-w-2xl mx-auto mb-8">
            <Link href="/dashboard/owner/akwaba">
                <Button variant="ghost" className="text-slate-400 hover:text-white mb-4 pl-0">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour Planning
                </Button>
            </Link>
            
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-black text-white flex items-center justify-center md:justify-start gap-3 uppercase tracking-tight">
                    <Lock className="text-red-500 w-8 h-8" /> Bloquer des dates
                </h1>
                <p className="text-slate-400 mt-2 text-sm">
                    Rendez votre logement indisponible pour maintenance ou usage personnel.
                </p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* SÉLECTION DU BIEN */}
            <div className="space-y-3">
                <Label className="text-slate-500 uppercase text-[10px] font-black tracking-widest ml-1">Logement concerné</Label>
                <div className="relative">
                    <select 
                        className="w-full bg-slate-950 border border-slate-800 text-white h-14 rounded-2xl px-4 focus:border-orange-500 outline-none transition appearance-none font-bold cursor-pointer"
                        value={formData.listingId}
                        onChange={(e) => setFormData({...formData, listingId: e.target.value})}
                        required
                    >
                        <option value="">-- Choisir une annonce --</option>
                        {listings.map((l) => (
                            <option key={l.id} value={l.id}>{l.title}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs pointer-events-none">▼</div>
                </div>
            </div>

            {/* DATES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="text-slate-500 uppercase text-[10px] font-black tracking-widest ml-1">Date de début</Label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <Input 
                            type="date"
                            className="bg-slate-950 border-slate-800 text-white h-14 pl-12 rounded-2xl focus:border-orange-500 font-medium"
                            value={formData.startDate}
                            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                            required
                            min={new Date().toISOString().split('T')[0]} 
                        />
                    </div>
                </div>
                <div className="space-y-3">
                    <Label className="text-slate-500 uppercase text-[10px] font-black tracking-widest ml-1">Date de fin</Label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <Input 
                            type="date"
                            className="bg-slate-950 border-slate-800 text-white h-14 pl-12 rounded-2xl focus:border-orange-500 font-medium"
                            value={formData.endDate}
                            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                            required
                            min={formData.startDate}
                        />
                    </div>
                </div>
            </div>

            {/* RAISON */}
            <div className="space-y-3">
                <Label className="text-slate-500 uppercase text-[10px] font-black tracking-widest ml-1">Motif (Optionnel)</Label>
                <Input 
                    placeholder="Ex: Travaux peinture, Famille..."
                    className="bg-slate-950 border-slate-800 text-white h-14 rounded-2xl focus:border-orange-500 placeholder:text-slate-700"
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
            </div>

            {/* WARNING */}
            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-200/80 leading-relaxed font-medium">
                    <strong className="text-orange-400">Attention :</strong> Ces dates seront immédiatement retirées des résultats de recherche. 
                    Aucun client ne pourra réserver sur cette période.
                </p>
            </div>

            <Button 
                type="submit" 
                disabled={submitting}
                className="w-full h-14 bg-white hover:bg-slate-200 text-black font-black uppercase tracking-widest rounded-2xl transition shadow-xl active:scale-95 disabled:opacity-50"
            >
                {submitting ? <Loader2 className="animate-spin" /> : 'Confirmer le blocage'}
            </Button>

        </form>
    </div>
  );
}
