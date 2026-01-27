"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palmtree, Loader2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api"; // ✅ Utilisation du wrapper sécurisé

interface PublishAkwabaModalProps {
  propertyId: string;
  propertyTitle: string;
  suggestedPrice?: number; // Prix mensuel pour aider au calcul
}

export default function PublishAkwabaModal({ propertyId, propertyTitle, suggestedPrice }: PublishAkwabaModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ALGORITHME DE PRIX : Loyer Mensuel / 20 jours (Marge de sécurité)
  // Arrondi aux 500 FCFA supérieurs pour un prix "propre"
  const calculateSuggestedNightPrice = (monthlyRent: number) => {
    if (!monthlyRent) return 25000;
    const rawPrice = monthlyRent / 20;
    return Math.ceil(rawPrice / 500) * 500;
  };

  const defaultNightPrice = suggestedPrice ? calculateSuggestedNightPrice(suggestedPrice) : 25000;
  const [pricePerNight, setPricePerNight] = useState(defaultNightPrice.toString());

  const handlePublish = async () => {
    if (!pricePerNight || parseInt(pricePerNight) < 5000) {
        toast.error("Le prix minimum est de 5 000 FCFA.");
        return;
    }

    setLoading(true);
    try {
      // ✅ APPEL SÉCURISÉ
      await api.post("/owner/listings", {
        propertyId,
        pricePerNight: parseInt(pricePerNight)
      });

      toast.success("Annonce publiée sur Akwaba ! 🌴");
      setOpen(false);
      
      // Redirection vers le dashboard Court Séjour pour voir l'annonce
      router.push("/dashboard/owner/listings"); 

    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erreur lors de la publication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
            <Palmtree size={16} /> 
            <span className="hidden sm:inline">Publier sur Akwaba</span>
            <span className="sm:hidden">Akwaba</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-400 text-xl">
            <Palmtree className="w-6 h-6" /> Court Séjour (Akwaba)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
            {/* RÉCAP BIEN */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-1">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Propriété cible</span>
                <span className="font-bold text-white text-lg truncate">{propertyTitle}</span>
            </div>

            {/* INPUT PRIX */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="text-sm font-bold">Prix par nuit</Label>
                    <span className="text-xs text-emerald-400 font-mono bg-emerald-900/30 px-2 py-1 rounded">
                        Recommandé : {defaultNightPrice.toLocaleString()} F
                    </span>
                </div>
                
                <div className="relative group">
                    <Input 
                        type="number" 
                        value={pricePerNight} 
                        onChange={(e) => setPricePerNight(e.target.value)}
                        className="bg-slate-950 border-slate-700 pl-4 pr-16 text-2xl font-black text-white h-14 focus:border-emerald-500 transition-colors"
                        min={5000}
                        step={500}
                    />
                    <span className="absolute right-4 top-4 text-xs text-slate-500 font-bold uppercase pointer-events-none">
                        FCFA / Nuit
                    </span>
                </div>

                {/* SIMULATEUR DE REVENUS */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-start gap-3">
                    <Calculator className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-slate-300">
                        <p>
                            Potentiel : <span className="text-white font-bold">{(parseInt(pricePerNight || "0") * 15).toLocaleString()} F</span> / mois
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Basé sur une occupation moyenne de 15 jours (50%).
                        </p>
                    </div>
                </div>
            </div>

            <Button 
                onClick={handlePublish} 
                disabled={loading} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold h-12 text-lg shadow-lg shadow-emerald-500/20 rounded-xl"
            >
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Activer l'annonce"}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
