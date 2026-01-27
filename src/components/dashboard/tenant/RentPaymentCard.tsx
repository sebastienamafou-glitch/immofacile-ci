"use client";

import { useState } from "react";
import { Clock, Calendar, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { initiatePayment } from "@/lib/api";
// ✅ IMPORT DU TYPE SSOT
import { TenantLeaseData } from "@/lib/types/tenant";

interface RentPaymentCardProps {
  lease: TenantLeaseData; // Typage strict : on attend un bail complet
  userPhone: string | null;
}

export default function RentPaymentCard({ lease, userPhone }: RentPaymentCardProps) {
  const [isPaying, setIsPaying] = useState(false);

  // Sécurité : Si le bail n'est pas actif, on ne peut pas payer
  const canPay = lease.isActive || lease.status === 'ACTIVE';

  const handlePayRent = async () => {
    if (!userPhone) {
        toast.error("Veuillez ajouter un numéro de téléphone à votre profil pour payer.");
        return;
    }

    setIsPaying(true); 
    try {
        const result = await initiatePayment({
            type: 'RENT',                 
            referenceId: lease.id,   
            phone: userPhone        
        });

        if (result.success && result.paymentUrl) {
            toast.success("Redirection vers CinetPay...");
            window.location.href = result.paymentUrl;
        } else {
            throw new Error("Erreur initialisation paiement");
        }
    } catch (err: any) {
        toast.error("Impossible d'initialiser le paiement.");
    } finally {
        setIsPaying(false); 
    }
  };

  return (
    <Card className="bg-[#0F172A] border-white/5 rounded-[2.5rem] overflow-hidden relative group shadow-2xl">
        <CardContent className="relative z-10 p-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                        <Clock className="w-4 h-4 text-orange-500" /> Prochaine Échéance
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter text-white flex items-baseline gap-2">
                        {lease.monthlyRent.toLocaleString()} 
                        <span className="text-xl font-bold uppercase text-slate-600">CFA</span>
                    </h2>
                    
                    {/* Badge dynamique selon le statut */}
                    {canPay ? (
                        <div className="flex items-center gap-2 mt-4 text-[11px] font-black text-emerald-400 bg-emerald-500/10 w-fit px-4 py-1.5 rounded-full border border-emerald-500/10 uppercase tracking-widest">
                            <Calendar className="w-3.5 h-3.5" /> Paiement ouvert
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 mt-4 text-[11px] font-black text-amber-400 bg-amber-500/10 w-fit px-4 py-1.5 rounded-full border border-amber-500/10 uppercase tracking-widest">
                            <AlertTriangle className="w-3.5 h-3.5" /> En attente validation
                        </div>
                    )}
                </div>

                <div className="w-full md:w-72">
                    <Button 
                        onClick={handlePayRent}
                        disabled={isPaying || !canPay}
                        className={`w-full text-sm font-black tracking-widest text-white uppercase transition-all shadow-xl h-16 rounded-2xl ${
                            canPay 
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 shadow-orange-500/20' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        {isPaying ? <Loader2 className="animate-spin mr-2" /> : null}
                        {isPaying ? "Connexion..." : (canPay ? "Payer le loyer" : "Dossier en cours")}
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
