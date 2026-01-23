"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palmtree, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PublishAkwabaModalProps {
  propertyId: string;
  propertyTitle: string;
  suggestedPrice?: number; // Prix mensuel pour aider au calcul
}

export default function PublishAkwabaModal({ propertyId, propertyTitle, suggestedPrice }: PublishAkwabaModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Calcul automatique d'un prix à la nuitée suggéré (Loyer / 20 jours pour marge)
  const defaultNightPrice = suggestedPrice ? Math.round((suggestedPrice / 20) / 500) * 500 : 25000;
  const [pricePerNight, setPricePerNight] = useState(defaultNightPrice.toString());

  const handlePublish = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            propertyId,
            pricePerNight: parseInt(pricePerNight)
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Annonce publiée sur Akwaba ! 🌴");
      setOpen(false);
      router.push("/dashboard/owner/listings"); // Redirection vers les annonces Akwaba

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-lg shadow-emerald-500/20">
            <Palmtree size={18} /> Publier sur Akwaba
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-400">
            <Palmtree className="w-5 h-5" /> Publier en Court Séjour
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <p className="text-sm text-slate-400 mb-1">Bien à publier :</p>
                <p className="font-bold text-white line-clamp-1">{propertyTitle}</p>
            </div>

            <div className="space-y-2">
                <Label>Prix par nuit (FCFA)</Label>
                <div className="relative">
                    <Input 
                        type="number" 
                        value={pricePerNight} 
                        onChange={(e) => setPricePerNight(e.target.value)}
                        className="bg-slate-950 border-slate-700 pl-4 text-lg font-bold text-emerald-400"
                    />
                    <span className="absolute right-4 top-2.5 text-xs text-slate-500 font-bold">FCFA / Nuit</span>
                </div>
                <p className="text-xs text-slate-500">
                    Suggestion : Un prix de <b>{parseInt(pricePerNight).toLocaleString()} F</b> vous rapporterait environ <b>{(parseInt(pricePerNight) * 15).toLocaleString()} F</b> pour 15 jours d'occupation.
                </p>
            </div>

            <Button onClick={handlePublish} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold h-12 text-lg">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Confirmer la publication"}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
