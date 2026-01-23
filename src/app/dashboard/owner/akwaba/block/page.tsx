"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // Ou votre système de notif habituel

export default function BlockDatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Données
  const [listings, setListings] = useState<any[]>([]);
  
  // Formulaire
  const [formData, setFormData] = useState({
    listingId: "",
    startDate: "",
    endDate: "",
    reason: "Maintenance" // Par défaut
  });

  // 1. Charger les annonces pour le menu déroulant
  useEffect(() => {
    async function fetchListings() {
      try {
        // On réutilise votre API existante pour lister les biens Akwaba
        const res = await fetch('/api/owner/akwaba/listings'); 
        if (res.ok) {
            const data = await res.json();
            // Adapter selon si l'API renvoie { listings: [] } ou [] directement
            setListings(data.listings || data || []); 
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  // 2. Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation basique
    if (!formData.listingId) {
        toast.error("Veuillez sélectionner une annonce.");
        return;
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        toast.error("La date de fin doit être après la date de début.");
        return;
    }

    setSubmitting(true);

    try {
        const stored = localStorage.getItem("immouser");
        const userEmail = stored ? JSON.parse(stored).email : "";
        const res = await fetch('/api/owner/akwaba/block', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail }, // <--- AJOUT SÉCURITÉ
            body: JSON.stringify(formData)
        });

        const json = await res.json();

        if (res.ok) {
            toast.success("Dates bloquées avec succès !");
            // Reset ou redirection
            setFormData({ ...formData, startDate: "", endDate: "" });
            router.push('/dashboard/owner/akwaba/bookings'); // On renvoie vers le planning
        } else {
            toast.error(json.error || "Erreur lors du blocage.");
        }
    } catch (error) {
        toast.error("Erreur de connexion.");
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="max-w-2xl mx-auto p-6 pb-24">
        
        <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-black text-white flex items-center justify-center md:justify-start gap-3">
                <Lock className="text-red-500" /> Bloquer des dates
            </h1>
            <p className="text-slate-400 mt-2">
                Rendez votre logement indisponible pour maintenance ou usage personnel.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl space-y-8">
            
            {/* SÉLECTION DU BIEN */}
            <div className="space-y-3">
                <Label className="text-slate-300 uppercase text-xs font-bold tracking-widest">Logement concerné</Label>
                <select 
                    className="w-full bg-black/40 border border-slate-700 text-white h-14 rounded-xl px-4 focus:border-orange-500 outline-none transition"
                    value={formData.listingId}
                    onChange={(e) => setFormData({...formData, listingId: e.target.value})}
                    required
                >
                    <option value="">-- Choisir une annonce --</option>
                    {listings.map((l) => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                </select>
            </div>

            {/* DATES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="text-slate-300 uppercase text-xs font-bold tracking-widest">Du</Label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <Input 
                            type="date"
                            className="bg-black/40 border-slate-700 text-white h-14 pl-12 rounded-xl"
                            value={formData.startDate}
                            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                            required
                            min={new Date().toISOString().split('T')[0]} // Pas dans le passé
                        />
                    </div>
                </div>
                <div className="space-y-3">
                    <Label className="text-slate-300 uppercase text-xs font-bold tracking-widest">Au</Label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <Input 
                            type="date"
                            className="bg-black/40 border-slate-700 text-white h-14 pl-12 rounded-xl"
                            value={formData.endDate}
                            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                            required
                            min={formData.startDate}
                        />
                    </div>
                </div>
            </div>

            {/* RAISON (Optionnel pour l'UI, utile pour mémoire) */}
            <div className="space-y-3">
                <Label className="text-slate-300 uppercase text-xs font-bold tracking-widest">Motif (Pour mémoire)</Label>
                <Input 
                    placeholder="Ex: Travaux peinture, Famille..."
                    className="bg-black/40 border-slate-700 text-white h-14 rounded-xl"
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
            </div>

            {/* WARNING */}
            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-200 leading-relaxed">
                    Ces dates seront immédiatement retirées des résultats de recherche Akwaba. 
                    Aucun client ne pourra réserver sur cette période.
                </p>
            </div>

            <Button 
                type="submit" 
                disabled={submitting}
                className="w-full h-14 bg-white hover:bg-slate-200 text-black font-black uppercase tracking-widest rounded-xl transition shadow-lg"
            >
                {submitting ? <Loader2 className="animate-spin" /> : 'Confirmer le blocage'}
            </Button>

        </form>
    </div>
  );
}
