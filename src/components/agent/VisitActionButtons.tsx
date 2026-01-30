"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Play, Loader2 } from "lucide-react";

interface VisitActionButtonsProps {
  missionId: string;
  status: string; // "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED"
}

export default function VisitActionButtons({ missionId, status }: VisitActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    try {
        const res = await fetch("/api/agent/visits", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ missionId, status: newStatus })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Erreur lors de la mise à jour");
        }

        toast.success(`Statut mis à jour : ${newStatus === 'ACCEPTED' ? 'Confirmé' : 'Terminé'}`);
        router.refresh(); // Rafraîchit les données serveur sans recharger la page
        
    } catch (error: any) {
        console.error("Erreur action visite:", error);
        toast.error(error.message || "Une erreur est survenue");
    } finally {
        setLoading(false);
    }
  };

  // CAS 1 : Visite en attente de confirmation
  if (status === 'PENDING') {
    return (
        <div className="flex gap-2 mt-4">
            <button 
                onClick={() => updateStatus('ACCEPTED')}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-900/20"
            >
                {loading ? <Loader2 className="animate-spin w-3 h-3"/> : <Play className="w-3 h-3 fill-current"/>}
                Confirmer le RDV
            </button>
            <button 
                onClick={() => updateStatus('CANCELLED')}
                disabled={loading}
                className="px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition"
                title="Annuler la visite"
            >
                <XCircle className="w-5 h-5"/>
            </button>
        </div>
    );
  }

  // CAS 2 : Visite confirmée, en attente de réalisation
  if (status === 'ACCEPTED') {
    return (
        <div className="mt-4">
            <button 
                onClick={() => updateStatus('COMPLETED')}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-slate-700 hover:border-emerald-500 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition group"
            >
                {loading ? <Loader2 className="animate-spin w-3 h-3"/> : <CheckCircle className="w-4 h-4 text-emerald-500 group-hover:text-white transition-colors"/>}
                Marquer comme effectuée
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-2 italic">
                Cliquez une fois la visite terminée pour valider votre mission.
            </p>
        </div>
    );
  }

  // CAS 3 : Terminée ou Annulée (Affichage passif déjà géré par la page parent, mais au cas où)
  return null;
}
