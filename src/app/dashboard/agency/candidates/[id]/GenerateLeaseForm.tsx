"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api"; // Ton instance Axios

interface GenerateLeaseFormProps {
  propertyId: string;
  tenantId: string;
  rent: number;
}

export default function GenerateLeaseForm({ propertyId, tenantId, rent }: GenerateLeaseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [depositMonths, setDepositMonths] = useState("2");
  const [advanceMonths, setAdvanceMonths] = useState("2");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Construction du payload exactement comme ton API l'attend
      const payload = {
        propertyId,
        tenantId, // Priorité absolue dans ton API
        rent,
        startDate,
        deposit: rent * Number(depositMonths),
        advance: rent * Number(advanceMonths),
      };

      const res = await api.post("/api/agency/leases", payload);

      if (res.data.success) {
        toast.success("Bail généré avec succès !");
        // Redirection vers le module des contrats
        router.push(`/dashboard/agency/contracts/${res.data.lease.id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors de la création du bail.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400 font-bold">Date d'entrée *</label>
        <input
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-bold">Caution</label>
          <select
            className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
            value={depositMonths}
            onChange={(e) => setDepositMonths(e.target.value)}
          >
            <option value="1">1 mois ({(rent * 1).toLocaleString()} F)</option>
            <option value="2">2 mois ({(rent * 2).toLocaleString()} F) - Max légal</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-bold">Avance</label>
          <select
            className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
            value={advanceMonths}
            onChange={(e) => setAdvanceMonths(e.target.value)}
          >
            <option value="1">1 mois ({(rent * 1).toLocaleString()} F)</option>
            <option value="2">2 mois ({(rent * 2).toLocaleString()} F) - Max légal</option>
          </select>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !startDate}
        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold h-12 mt-2"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Générer le contrat de bail"}
      </Button>
    </form>
  );
}
