"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
    Wallet, ArrowUpRight, ArrowDownLeft, History, 
    Loader2, AlertCircle, CheckCircle2, ShieldAlert,
    Smartphone, CreditCard, X
} from "lucide-react";

// --- TYPES STRICTS ---
interface Transaction {
    id: string;
    amount: number;
    type: "CREDIT" | "DEBIT" | "REFUND";
    reason: string;
    status: string;
    createdAt: string;
}

interface WalletData {
    walletBalance: number;
    kycStatus: string;
    transactions: Transaction[];
}

export default function AgentWalletPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<WalletData | null>(null);

    // États de la modale de retrait
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState<number | "">("");
    const [paymentMethod, setPaymentMethod] = useState("WAVE");
    const [paymentNumber, setPaymentNumber] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const fetchWallet = async () => {
        try {
            // Appel à l'endpoint GET (à créer si non existant)
            const res = await api.get('/agent/wallet');
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (error) {
            console.error("Erreur Wallet:", error);
            toast.error("Impossible de charger votre portefeuille.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();
    }, []);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!data) return;
        const amount = Number(withdrawAmount);

        if (amount <= 0) return toast.error("Le montant doit être supérieur à 0.");
        if (amount > data.walletBalance) return toast.error("Solde insuffisant.");
        if (paymentNumber.length < 8) return toast.error("Numéro de paiement invalide.");

        try {
            setIsWithdrawing(true);
            const res = await api.post('/agent/wallet/withdraw', {
                amount,
                paymentMethod,
                paymentNumber
            });

            if (res.data.success) {
                toast.success("Retrait traité avec succès ! 💸");
                setIsWithdrawModalOpen(false);
                setWithdrawAmount("");
                setPaymentNumber("");
                fetchWallet(); // Rafraîchissement des données (Solde & Historique)
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Erreur lors du retrait.");
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500"/>
            <p className="text-sm font-mono text-slate-500">Chargement du coffre-fort...</p>
        </div>
    );

    const isKycVerified = data?.kycStatus === "VERIFIED";

    return (
        <div className="p-6 md:p-10 font-sans text-slate-200 min-h-screen pb-24 bg-[#0B1120]">
            
            {/* EN-TÊTE & SOLDE GLOBAL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                <div className="lg:col-span-2 bg-gradient-to-br from-blue-900 to-slate-900 border border-blue-500/30 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute right-0 top-0 p-6 opacity-10 pointer-events-none">
                        <Wallet className="w-32 h-32 text-white" />
                    </div>
                    
                    <h1 className="text-sm font-bold text-blue-300 uppercase tracking-widest mb-2">Solde Disponible</h1>
                    <p className="text-5xl font-black text-white mb-6">
                        {data?.walletBalance?.toLocaleString()} <span className="text-2xl text-blue-400">FCFA</span>
                    </p>

                    {!isKycVerified ? (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm flex items-center gap-3 w-fit">
                            <ShieldAlert className="w-5 h-5" />
                            Accréditation requise pour retirer vos fonds.
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsWithdrawModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/50 transition active:scale-95"
                        >
                            <ArrowUpRight className="w-5 h-5" />
                            Demander un Retrait
                        </button>
                    )}
                </div>

                {/* KPI RAPIDES */}
                <div className="flex flex-col gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                            <ArrowDownLeft className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500">Total Encaissé</p>
                            <p className="text-xl font-black text-white">
                                {data?.transactions.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.amount, 0).toLocaleString()} F
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                        <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500">Total Retiré</p>
                            <p className="text-xl font-black text-white">
                                {data?.transactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.amount, 0).toLocaleString()} F
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* HISTORIQUE DES TRANSACTIONS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <History className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-white text-lg">Historique des opérations</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                            <tr>
                                <th className="p-4 pl-6">Date</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Détails</th>
                                <th className="p-4 text-right pr-6">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {(!data?.transactions || data.transactions.length === 0) ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-500 italic">
                                        Aucune transaction pour le moment.
                                    </td>
                                </tr>
                            ) : (
                                data.transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-800/20 transition">
                                        <td className="p-4 pl-6 text-slate-400 font-mono text-xs">
                                            {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4">
                                            {tx.type === "CREDIT" ? (
                                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold uppercase flex w-fit items-center gap-1">
                                                    <ArrowDownLeft className="w-3 h-3" /> Commission
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md text-[10px] font-bold uppercase flex w-fit items-center gap-1">
                                                    <ArrowUpRight className="w-3 h-3" /> Retrait
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-300 text-sm font-medium">
                                            {tx.reason}
                                        </td>
                                        <td className={`p-4 text-right pr-6 font-mono font-black ${tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-orange-400'}`}>
                                            {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount.toLocaleString()} F
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALE DE RETRAIT */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="font-black text-xl text-white">Nouveau Retrait</h3>
                            <button onClick={() => setIsWithdrawModalOpen(false)} className="text-slate-400 hover:text-white transition">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleWithdraw} className="p-6 space-y-6">
                            {/* Montant */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montant (FCFA)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        min="1"
                                        max={data?.walletBalance}
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-4 pr-12 text-2xl font-black text-white focus:border-blue-500 outline-none transition"
                                        placeholder="0"
                                        required
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">F</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Disponible : {data?.walletBalance.toLocaleString()} F</span>
                                    <button type="button" onClick={() => setWithdrawAmount(data?.walletBalance || 0)} className="text-blue-400 hover:underline font-bold">Max</button>
                                </div>
                            </div>

                            {/* Méthode de paiement */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Méthode de réception</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setPaymentMethod('WAVE')}
                                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border ${paymentMethod === 'WAVE' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'} transition`}
                                    >
                                        <Smartphone className="w-6 h-6" />
                                        <span className="text-xs font-bold">Wave</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setPaymentMethod('ORANGE_MONEY')}
                                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border ${paymentMethod === 'ORANGE_MONEY' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'} transition`}
                                    >
                                        <CreditCard className="w-6 h-6" />
                                        <span className="text-xs font-bold">Orange Money</span>
                                    </button>
                                </div>
                            </div>

                            {/* Numéro */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Numéro de téléphone</label>
                                <input 
                                    type="tel" 
                                    value={paymentNumber}
                                    onChange={(e) => setPaymentNumber(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 outline-none transition"
                                    placeholder="Ex: 0707070707"
                                    required
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isWithdrawing || !withdrawAmount || !paymentNumber}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition active:scale-95"
                            >
                                {isWithdrawing ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Traitement...</>
                                ) : (
                                    <><CheckCircle2 className="w-5 h-5" /> Confirmer le retrait</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
