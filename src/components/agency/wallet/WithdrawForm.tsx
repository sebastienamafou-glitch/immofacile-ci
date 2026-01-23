"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

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

    if (value > maxAmount) {
        toast.error("Solde insuffisant.");
        return;
    }
    if (value < 1000) {
        toast.error("Montant minimum : 1000 FCFA");
        return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/agency/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            amount: value,
            provider,
            phone
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Retrait initié avec succès !");
      setOpen(false);
      router.refresh();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/40 backdrop-blur-sm">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Demander un retrait
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Retrait de fonds</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleWithdraw} className="space-y-4 mt-4">
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg text-center">
                <p className="text-xs text-orange-400 uppercase">Solde Max</p>
                <p className="text-2xl font-bold text-orange-500">{maxAmount.toLocaleString()} F</p>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Montant à retirer</label>
                <Input 
                    type="number" 
                    placeholder="Ex: 50000" 
                    className="bg-slate-950 border-slate-800 text-white"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Moyen de paiement</label>
                <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="WAVE">Wave</SelectItem>
                        <SelectItem value="ORANGE_MONEY">Orange Money</SelectItem>
                        <SelectItem value="MTN_MOMO">MTN MoMo</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Numéro de téléphone</label>
                <Input 
                    placeholder="07xxxxxxxx" 
                    className="bg-slate-950 border-slate-800 text-white"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-500 font-bold">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Confirmer le retrait"}
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
