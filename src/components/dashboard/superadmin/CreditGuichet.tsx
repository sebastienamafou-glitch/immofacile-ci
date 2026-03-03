"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { CreditCard, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

// Typage strict pour remplacer le "any"
interface Owner {
  id: string;
  name: string;
  walletBalance: number;
}

interface CreditGuichetProps {
  owners: Owner[];
}

export default function CreditGuichet({ owners }: CreditGuichetProps) {
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  const handleAddCredit = async () => {
    if (!selectedOwnerId || !creditAmount) return;
    setIsSubmittingCredit(true);
    try {
        await api.post('/superadmin/users/credit', { ownerId: selectedOwnerId, amount: parseInt(creditAmount) });
        Swal.fire({ icon: 'success', title: 'Compte Crédité', text: `${parseInt(creditAmount).toLocaleString()} F ajoutés.`, timer: 2000, showConfirmButton: false, background: '#020617', color: '#fff' });
        setCreditAmount("");
    } catch (e) { 
        Swal.fire({ icon: 'error', title: 'Erreur', text: "Impossible de créditer le compte.", background: '#020617', color: '#fff' }); 
    }
    finally { setIsSubmittingCredit(false); }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500"/> Guichet Rapide (Crédit manuel)
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
                <select 
                    onChange={(e) => setSelectedOwnerId(e.target.value)} 
                    value={selectedOwnerId} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 outline-none focus:border-emerald-500 transition appearance-none"
                >
                    <option value="">Choisir un bénéficiaire...</option>
                    {owners.map((o) => (
                        <option key={o.id} value={o.id}>
                            {o.name} (Solde actuel: {o.walletBalance.toLocaleString()} F)
                        </option>
                    ))}
                </select>
                <div className="absolute right-4 top-4 pointer-events-none text-slate-500">▼</div>
            </div>
            <div className="relative w-full sm:w-48">
                <input 
                    type="number" 
                    placeholder="Montant" 
                    value={creditAmount} 
                    onChange={e => setCreditAmount(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-emerald-500 transition pl-8" 
                />
                <span className="absolute left-3 top-4 text-slate-500 font-bold">F</span>
            </div>
            <button 
                onClick={handleAddCredit} 
                disabled={isSubmittingCredit} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-xl transition text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
            >
                {isSubmittingCredit ? <Loader2 className="animate-spin w-4 h-4"/> : "Créditer"}
            </button>
        </div>
    </div>
  );
}
