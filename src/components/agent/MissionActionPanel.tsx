"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Upload, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function MissionActionPanel({ missionId, status }: { missionId: string, status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/missions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId, reportNote: note }),
      });

      if (!res.ok) throw new Error("Erreur lors de la clôture");

      toast.success("Mission terminée avec succès !");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (status === "COMPLETED") {
    return (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <h3 className="text-white font-bold text-lg">Mission Terminée</h3>
            <p className="text-emerald-400/80 text-sm">Le rapport a été transmis. Le paiement est en cours de validation.</p>
        </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <div>
        <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
            <FileText className="text-orange-500" size={20} /> Rapport d'intervention
        </h3>
        <p className="text-slate-400 text-sm">
            Veuillez confirmer que la mission a été réalisée conformément aux attentes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-dashed border-slate-700 hover:bg-slate-800 hover:text-white">
            <Upload size={24} className="text-slate-500" />
            <span className="text-xs">Ajouter Photos</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-dashed border-slate-700 hover:bg-slate-800 hover:text-white">
            <FileText size={24} className="text-slate-500" />
            <span className="text-xs">Ajouter PDF</span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 text-lg">
                Valider la Mission
            </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-950 border-slate-800 text-white">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                    <CheckCircle2 className="text-emerald-500" /> Confirmer la fin ?
                </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <p className="text-slate-400 text-sm">
                    Cette action est irréversible. Elle déclenchera la facturation au propriétaire.
                </p>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Note rapide (Optionnel)</label>
                    <Textarea 
                        placeholder="Ex: Visite effectuée, client très intéressé..." 
                        className="bg-slate-900 border-slate-800 text-white"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </div>
                <Button 
                    onClick={handleComplete} 
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : "Je confirme avoir terminé"}
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
