"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cancelBooking } from "@/actions/bookings";

export default function CancelTripButton({ bookingId, status }: { bookingId: string, status: string }) {
  const [loading, setLoading] = useState(false);

  // On cache le bouton si c'est déjà annulé ou terminé
  if (status === "CANCELLED" || status === "COMPLETED") return null;

  const handleCancel = async () => {
    setLoading(true);
    try {
      const result = await cancelBooking(bookingId);
      if (result.success) {
        toast.success("Réservation annulée avec succès.");
      } else {
        toast.error(result.error || "Erreur inconnue");
      }
    } catch (error) {
      toast.error("Impossible d'annuler pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 w-full justify-start"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <XCircle className="w-4 h-4 mr-2" />}
          Annuler la réservation
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" /> Êtes-vous sûr ?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Cette action est irréversible. Si vous avez déjà payé, le remboursement sera initié selon les conditions d'annulation de l'hôte.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-slate-700 text-white hover:bg-slate-800">
            Retour
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-700 text-white border-none"
          >
            {loading ? "Annulation..." : "Confirmer l'annulation"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
