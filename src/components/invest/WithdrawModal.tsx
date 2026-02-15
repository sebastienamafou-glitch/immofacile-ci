"use client";

import { useState } from "react";
// ✅ IMPORT DU CLIENT UUID
import { v4 as uuidv4 } from 'uuid'; 
import { api } from "@/lib/api"; // Assurez-vous que c'est votre client axios configuré
import { toast } from "sonner";
import { 
  X, Wallet, ArrowRight, Loader2, Smartphone, ShieldCheck, AlertCircle 
} from "lucide-react";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
  onSuccess: () => void; 
}

const PROVIDERS = [
  { 
    id: 'WAVE', 
    name: 'Wave', 
    color: 'bg-[#1DC4FF]/10', 
    border: 'border-[#1DC4FF]/30', 
    text: 'text-[#1DC4FF]',
    hover: 'hover:border-[#1DC4FF]'
  },
  { 
    id: 'ORANGE_MONEY', 
    name: 'Orange Money', 
    color: 'bg-[#FF7900]/10', 
    border: 'border-[#FF7900]/30', 
    text: 'text-[#FF7900]',
    hover: 'hover:border-[#FF7900]'
  },
  { 
    id: 'MTN_MOMO', 
    name: 'MTN MoMo', 
    color: 'bg-[#FFCC00]/10', 
    border: 'border-[#FFCC00]/30', 
    text: 'text-[#FFCC00]',
    hover: 'hover:border-[#FFCC00]'
  },
];

export default function WithdrawModal({ isOpen, onClose, userBalance, onSuccess }: WithdrawModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [provider, setProvider] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const numericAmount = Number(amount) || 0;
  const isOverBalance = numericAmount > userBalance;
  const remainingBalance = userBalance - numericAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation stricte Front-end
    if (numericAmount <= 0) {
        toast.error("Le montant doit être positif.");
        return;
    }
    if (isOverBalance) {
        toast.error("Solde insuffisant.");
        return;
    }
    if (!provider) {
        toast.error("Veuillez sélectionner un opérateur.");
        return;
    }
    if (!phone || phone.length < 10) {
        toast.error("Numéro de téléphone invalide.");
        return;
    }

    setLoading(true);

    try {
        // ✅ GÉNÉRATION CLÉ UNIQUE (Idempotence)
        const idempotencyKey = uuidv4();

        const res = await api.post('/invest/withdraw', { // Route API Backend
            amount: numericAmount,
            provider,
            phone,
            idempotencyKey // ✅ Indispensable pour votre Backend
        });

        if (res.data.success) {
            toast.success("Retrait validé !", {
                description: `Nouveau solde : ${res.data.balance.toLocaleString()} FCFA`
            });
            onSuccess(); // Refresh dashboard
            onClose();   // Fermer modal
        }
    } catch (error: any) {
        console.error("Erreur retrait:", error);
        
        // Gestion fine des erreurs Backend
        const msg = error.response?.data?.error || "Erreur technique.";
        
        if (msg.includes("Solde")) toast.error("Fonds insuffisants.");
        else if (msg.includes("KYC")) toast.error("Vérification d'identité requise.");
        else if (msg.includes("Transaction")) toast.error("Doublon détecté, veuillez patienter.");
        else toast.error("Échec du retrait", { description: msg });
        
    } finally {
        setLoading(false);
    }
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('fr-FR').format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0B1120] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <div>
                <h3 className="text-white font-bold text-lg">Retirer des Fonds</h3>
                <p className="text-slate-400 text-xs">Transfert vers Mobile Money</p>
            </div>
            <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
                <X className="w-5 h-5"/>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* 1. COMPTEUR SOLDE */}
            <div className={`p-4 rounded-xl border transition-colors duration-300 ${isOverBalance ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Solde Disponible</span>
                    <Wallet className={`w-4 h-4 ${isOverBalance ? 'text-red-500' : 'text-emerald-500'}`} />
                </div>
                <p className={`text-2xl font-black font-mono ${isOverBalance ? 'text-red-500' : 'text-white'}`}>
                    {formatMoney(userBalance)} <span className="text-sm font-bold">FCFA</span>
                </p>
                {isOverBalance && (
                    <div className="flex items-center gap-2 mt-2 text-red-400 text-xs font-bold">
                        <AlertCircle className="w-3 h-3"/> Montant supérieur au solde
                    </div>
                )}
            </div>

            {/* 2. CHOIX OPÉRATEUR */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase">Opérateur</label>
                <div className="grid grid-cols-3 gap-3">
                    {PROVIDERS.map((p) => (
                        <div 
                            key={p.id}
                            onClick={() => setProvider(p.id)}
                            className={`cursor-pointer rounded-xl p-3 border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center
                                ${provider === p.id 
                                    ? `${p.color} ${p.border} ring-1 ring-offset-0 ${p.text.replace('text-', 'ring-')}` 
                                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] ' + p.hover
                                }
                            `}
                        >
                            <Smartphone className={`w-5 h-5 ${provider === p.id ? p.text : 'text-slate-500'}`}/>
                            <span className={`text-[10px] font-bold ${provider === p.id ? 'text-white' : 'text-slate-400'}`}>
                                {p.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. MONTANT & TÉLÉPHONE */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Montant à retirer</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Min 1000"
                            className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] outline-none transition"
                        />
                        <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-500">FCFA</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Numéro de téléphone</label>
                    <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ex: 0708091011"
                        className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] outline-none transition"
                    />
                </div>
            </div>

            {/* 4. ACTION */}
            <div className="pt-2">
                <div className="flex justify-between items-center text-xs text-slate-500 mb-4 px-1">
                    <span>Nouveau solde estimé :</span>
                    <span className={`font-mono font-bold ${remainingBalance < 0 ? 'text-red-500' : 'text-white'}`}>
                        {formatMoney(remainingBalance > 0 ? remainingBalance : 0)} FCFA
                    </span>
                </div>

                <button 
                    type="submit"
                    disabled={loading || isOverBalance || numericAmount <= 0 || !provider || !phone}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                        ${loading || isOverBalance 
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                            : 'bg-[#F59E0B] hover:bg-orange-500 text-[#020617] shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                        }
                    `}
                >
                    {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Traitement sécurisé...</>
                    ) : (
                        <><ShieldCheck className="w-5 h-5" /> Confirmer le Retrait <ArrowRight className="w-4 h-4"/></>
                    )}
                </button>
            </div>

        </form>
      </div>
    </div>
  );
}
