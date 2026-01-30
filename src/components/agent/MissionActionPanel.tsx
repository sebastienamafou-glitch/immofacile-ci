"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Upload, Loader2, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api"; // ✅ Wrapper Sécurisé
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function MissionActionPanel({ missionId, status }: { missionId: string, status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  // Cas : Mission Terminée
  if (status === "COMPLETED") {
    return (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col items-center text-center gap-2 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 shadow-emerald-500/50 drop-shadow-lg" />
            <h3 className="text-white font-bold text-lg">Mission Terminée</h3>
            <p className="text-emerald-400/80 text-sm">Le rapport a été transmis. Le paiement est crédité.</p>
        </div>
    );
  }

  // Cas : Mission non acceptée (Sécurité visuelle)
  if (status !== "ACCEPTED") {
     return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center text-center gap-2 opacity-60">
            <Lock className="w-8 h-8 text-slate-500" />
            <p className="text-slate-500 text-sm">Veuillez accepter la mission pour débloquer les actions.</p>
        </div>
     );
  }

  const handleComplete = async () => {
    setLoading(true);
    try {
      // ✅ APPEL SÉCURISÉ (Axios + Cookie)
      const res = await api.post("/agent/missions/complete", {
         missionId, 
         reportNote: note 
      });

      if (res.data.success) {
        toast.success("Mission terminée avec succès ! 💰");
        setOpen(false);
        router.refresh();
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || "Une erreur est survenue";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
      <div>
        <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
            <FileText className="text-orange-500" size={20} /> Rapport d'intervention
        </h3>
        <p className="text-slate-400 text-sm">
            Veuillez confirmer que la mission a été réalisée conformément aux attentes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-dashed border-slate-700 bg-transparent hover:bg-slate-800 hover:text-white transition-colors">
            <Upload size={24} className="text-slate-500 group-hover:text-white" />
            <span className="text-xs font-medium">Ajouter Photos</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-dashed border-slate-700 bg-transparent hover:bg-slate-800 hover:text-white transition-colors">
            <FileText size={24} className="text-slate-500 group-hover:text-white" />
            <span className="text-xs font-medium">Ajouter PDF</span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 text-lg shadow-lg shadow-emerald-900/20 active:scale-95 transition-transform">
                Valider la Mission
            </Button>
        </DialogTrigger>
        <DialogContent className="bg-[#0B1120] border-slate-800 text-white sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-black">
                    <CheckCircle2 className="text-emerald-500" /> Confirmer la fin ?
                </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg flex gap-3">
                    <AlertTriangle className="text-orange-500 shrink-0 w-5 h-5" />
                    <p className="text-orange-200/80 text-xs">
                        Cette action est irréversible. Elle déclenchera la facturation au propriétaire et le crédit de votre portefeuille.
                    </p>
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Note rapide (Optionnel)</label>
                    <Textarea 
                        placeholder="Ex: Visite effectuée, client très intéressé..." 
                        className="bg-slate-950 border-slate-800 text-white min-h-[100px] focus:border-emerald-500"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </div>
                <Button 
                    onClick={handleComplete} 
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold h-12"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : "Je confirme avoir terminé"}
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
