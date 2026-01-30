"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  TrendingUp, Users, CheckCircle, Loader2, Info 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Swal from "sweetalert2";

const formatFCFA = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
};

export default function DividendDistributor() {
  const [amount, setAmount] = useState<number | string>("");
  const [period, setPeriod] = useState("T1 2026");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);

  const handleDistribute = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Veuillez saisir un montant valide.");
      return;
    }

    // Confirmation Sécurisée
    const confirm = await Swal.fire({
        title: 'Confirmer la distribution ?',
        text: `Vous allez verser ${formatFCFA(value)} aux investisseurs pour la période ${period}.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#F59E0B',
        cancelButtonColor: '#334155',
        confirmButtonText: 'Oui, Distribuer',
        background: '#020617', color: '#fff'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setReport(null); 

    try {
      const res = await api.post('/superadmin/finance/distribute', {
        amount: value,
        periodName: period
      });

      if (res.data.success) {
        setReport(res.data.report);
        toast.success("Distribution effectuée avec succès !");
        setAmount(""); 
      }
    } catch (error: any) {
      console.error("Erreur distribution:", error);
      const msg = error.response?.data?.error || "Erreur technique lors de la distribution.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#0B1120] border-white/5 shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#F59E0B]"/> 
                    Distribution de Dividendes
                </CardTitle>
                <CardDescription className="text-slate-400">
                    Injectez des liquidités directement dans les wallets des investisseurs.
                </CardDescription>
            </div>
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                Action Sensible
            </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-slate-300 text-xs uppercase font-bold">Période (Référence)</Label>
                <Input 
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="bg-[#020617] border-white/10 text-white focus:border-[#F59E0B]"
                    placeholder="Ex: T2 2026"
                />
            </div>
            <div className="space-y-2">
                <Label className="text-slate-300 text-xs uppercase font-bold">Montant Global à Verser</Label>
                <div className="relative">
                    <Input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-[#020617] border-white/10 text-white font-mono font-bold pl-4 pr-12 focus:border-[#F59E0B]"
                        placeholder="Ex: 10000000"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">FCFA</span>
                </div>
            </div>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl flex gap-3 text-sm text-blue-300">
            <Info className="w-5 h-5 shrink-0" />
            <p>Le système calculera automatiquement la part de chaque investisseur au prorata de son capital engagé.</p>
        </div>

        <Button 
            onClick={handleDistribute}
            disabled={loading || !amount}
            className="w-full bg-[#F59E0B] hover:bg-orange-600 text-black font-bold h-12 text-base transition-all"
        >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2"/> Distribution en cours...</> : "Lancer la Distribution"}
        </Button>

        {report && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 mb-4 text-emerald-500 font-bold uppercase tracking-wide text-sm">
                    <CheckCircle className="w-5 h-5"/> Rapport d'Exécution
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-[#020617] p-3 rounded-lg border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Distribué</p>
                        <p className="text-emerald-400 font-mono font-bold">{formatFCFA(report.realDistributed)}</p>
                    </div>
                     <div className="bg-[#020617] p-3 rounded-lg border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Bénéficiaires</p>
                        <div className="flex items-center justify-center gap-1 text-white font-mono font-bold">
                            <Users className="w-3 h-3 text-blue-400"/> {report.beneficiaries}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
