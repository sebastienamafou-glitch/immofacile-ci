"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// import { api } from "@/lib/api"; // Optionnel si vous préférez axios

interface CheckoutButtonProps {
  listingId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  userEmail?: string; // Optionnel car géré par le backend via headers
}

export default function CheckoutButton({ listingId, startDate, endDate }: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      // ✅ CORRECTION DU CHEMIN API : /booking (et non /book)
      const res = await fetch("/api/guest/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          startDate,
          endDate,
          // Pas besoin d'envoyer le prix ou l'email, le serveur les récupère de façon sécurisée
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du paiement");
      }

      // Succès
      toast.success("Réservation confirmée ! 🌴", {
        description: "Préparez vos valises, c'est validé."
      });
      
      // Redirection vers le Dashboard Guest
      router.push("/dashboard/guest/trips");

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Échec de la transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      size="lg"
      className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#F59E0B] to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white shadow-lg shadow-orange-900/20 rounded-xl transition-all active:scale-95"
      onClick={handlePayment}
      disabled={loading}
    >
      {loading ? (
        <>
            <Loader2 className="animate-spin mr-2 w-5 h-5" /> Traitement sécurisé...
        </>
      ) : (
        <span className="flex items-center gap-2">
            <Lock className="w-5 h-5" /> CONFIRMER ET PAYER
        </span>
      )}
    </Button>
  );
}
