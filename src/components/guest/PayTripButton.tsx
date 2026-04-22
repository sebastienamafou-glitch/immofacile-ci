'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { initiateBookingPayment } from "@/actions/payment";
import { toast } from "sonner";

export default function PayTripButton({ bookingId }: { bookingId: string }) {
    const [isLoading, setIsLoading] = useState(false);

    const handlePayment = async () => {
        setIsLoading(true);
        try {
            const res = await initiateBookingPayment(bookingId);
            if (res.paymentUrl) {
                window.location.href = res.paymentUrl;
            } else if (res.error) {
                toast.error(res.error);
                setIsLoading(false);
            }
        } catch {
            toast.error("Erreur lors de l'initialisation du paiement.");
            setIsLoading(false);
        }
    };

    return (
        <Button 
            onClick={handlePayment} 
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
        >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
            {isLoading ? "Connexion sécurisée..." : "Payer maintenant"}
        </Button>
    );
}
