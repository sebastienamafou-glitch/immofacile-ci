"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowUpRight, Wallet, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api"; // ✅ Wrapper Sécurisé

interface WithdrawFormProps {
  maxAmount: number;
}

export default function WithdrawForm({ maxAmount }: WithdrawFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("WAVE");
  const [phone, setPhone] = useState("");

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseInt(amount);

    // 1. VALIDATIONS CLIENT
    if (isNaN(value) || value < 1000) {
        toast.error("Le montant minimum est de 1000 FCFA.");
        return;
    }

    if (value > maxAmount) {
        toast.error("Solde insuffisant pour ce retrait.");
        return;
    }

    if (!phone || phone.length < 10) {
        toast.error("Numéro de téléphone invalide.");
        return;
    }

    setLoading(true);

    try {
      // 2. APPEL API SÉCURISÉ (B2B)
      const res = await api.post("/agency/wallet/withdraw", {
          amount: value,
          provider,
          phone
      });

      if (res.data.success) {
          toast.success("Demande de retrait validée ! 💸");
          setOpen(false);
          setAmount(""); // Reset
          router.refresh(); // Rafraîchit les données de la page (Solde)
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Erreur lors du traitement.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm font-bold shadow-lg transition-all active:scale-95">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Demander un virement
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0B1120] border-slate-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
              <Wallet className="text-orange-500" /> Retrait de Fonds
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleWithdraw} className="space-y-6 mt-2">
            
            {/* SOLDE DISPO */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Disponible</span>
                <span className="text-xl font-black text-emerald-400">{maxAmount.toLocaleString()} F</span>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Montant à retirer</label>
                    <div className="relative">
                        <Input 
                            type="number" 
                            placeholder="Ex: 50000" 
                            className="bg-slate-950 border-slate-800 text-white pl-4 h-12 text-lg font-bold placeholder:font-normal focus:border-orange-500 transition-colors"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                        <div className="absolute right-4 top-3 text-slate-500 font-bold text-sm">FCFA</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Réseau</label>
                        <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-white h-12">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                <SelectItem value="WAVE">Wave CI</SelectItem>
                                <SelectItem value="ORANGE_MONEY">Orange Money</SelectItem>
                                <SelectItem value="MTN_MOMO">MTN MoMo</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Virement Bancaire</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Numéro / RIB</label>
                        <Input 
                            placeholder="07xxxxxxxx" 
                            className="bg-slate-950 border-slate-800 text-white h-12 font-mono"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>
                </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-500 font-bold h-12 text-lg shadow-lg shadow-orange-900/20">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <><CreditCard className="mr-2 h-5 w-5"/> Confirmer le retrait</>}
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
