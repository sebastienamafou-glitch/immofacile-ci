"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  Loader2, Building2, Percent, ShieldCheck, 
  Search, AlertCircle, CheckCircle2 
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DelegateModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  onSuccess: () => void;
}

export default function DelegateManagementModal({ isOpen, onClose, propertyId, onSuccess }: DelegateModalProps) {
  const [loading, setLoading] = useState(false);
  const [agencyCode, setAgencyCode] = useState("");
  const [commissionRate, setCommissionRate] = useState("8");
  const [step, setStep] = useState<"form" | "success">("form");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post(`/owner/properties/${propertyId}/delegate`, {
        agencyCode,
        commissionRate: parseFloat(commissionRate)
      });

      if (response.data.success) {
        setStep("success");
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors de la délégation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-slate-900 border-slate-800 text-white">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                <Building2 className="text-purple-500" /> Déléguer la gestion
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Transférez la gestion de votre bien à une agence partenaire.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-slate-300 font-bold uppercase text-xs">Code de l'agence</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <Input 
                    placeholder="Ex: AGENCE-CIV-001" 
                    className="pl-10 bg-slate-950 border-slate-700 h-12"
                    value={agencyCode}
                    onChange={(e) => setAgencyCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 font-bold uppercase text-xs">Commission convenue (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-3 w-4 h-4 text-purple-500" />
                  <Input 
                    type="number"
                    className="pl-10 bg-slate-950 border-slate-700 h-12 font-bold text-purple-400"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    min="1"
                    max="20"
                    required
                  />
                </div>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex gap-3">
                <ShieldCheck className="w-5 h-5 text-purple-500 shrink-0" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  En déléguant ce bien, l'agence pourra créer des baux, percevoir les loyers et gérer les incidents en votre nom.
                </p>
              </div>

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12"
                >
                  {loading ? <Loader2 className="animate-spin mr-2" /> : "Confirmer la délégation"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <div className="py-10 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold">Demande envoyée !</h3>
            <p className="text-slate-400 text-sm px-6">
              L'agence a été notifiée. Le bien sera sous sa gestion dès qu'elle aura accepté le mandat.
            </p>
            <Button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 w-full mt-4">Fermer</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
