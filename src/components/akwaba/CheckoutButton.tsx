"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CheckoutButtonProps {
  listingId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  userEmail: string;
}

export default function CheckoutButton({ listingId, startDate, endDate, totalPrice, userEmail }: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/guest/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          startDate,
          endDate,
          totalPrice,
          userEmail
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du paiement");
      }

      toast.success("Réservation confirmée avec succès ! 🌴");
      
      // Redirection vers la liste des voyages
      router.push("/dashboard/guest/trips");

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      size="lg"
      className="w-full h-14 text-lg font-bold bg-[#F59E0B] hover:bg-orange-500 text-black shadow-lg shadow-orange-500/20 rounded-xl transition-all"
      onClick={handlePayment}
      disabled={loading}
    >
      {loading ? (
        <>
            <Loader2 className="animate-spin mr-2" /> Traitement...
        </>
      ) : (
        "Confirmer et payer"
      )}
    </Button>
  );
}
