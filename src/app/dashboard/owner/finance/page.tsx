"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Wallet, TrendingUp, Lock, 
  AlertCircle, X, Smartphone, CheckCircle, 
  Info, Loader2, Plane
} from "lucide-react";
import dynamic from "next/dynamic";
import { User } from "@prisma/client";
import { toast } from "sonner";

// Chargement PDF Dynamique
const DownloadRentReceipt = dynamic(
  () => import('@/components/pdf/DownloadRentReceipt'),
  { ssr: false }
);

// --- 1. INTERFACES STRICTES ---

interface TransactionDetails {
  property: string;
  tenant?: string; 
  guest?: string;  
}

interface FinanceItem {
  id: string;
  amount: number;       // NET Owner
  grossAmount: number;  // BRUT Client
  type?: string;        // 'LOYER', etc.
  status: string;
  date: string;
  source: 'RENTAL' | 'AKWABA';
  details: TransactionDetails;
  leaseId?: string;
}

interface FinanceData {
  walletBalance: number;
  escrowBalance: number;
  payments: FinanceItem[]; 
  bookings: FinanceItem[]; 
  user: Pick<User, 'name' | 'email' | 'phone' | 'address'>; 
}

export default function OwnerFinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinanceData | null>(null);
  
  // États Modale Retrait
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // --- 2. CHARGEMENT (ZERO TRUST) ---
  const fetchData = async () => {
    try {
      // ✅ APPEL SÉCURISÉ : Cookie Only
      const res = await api.get('/owner/finance');
      if(res.data.success) {
          setData(res.data);
      }
    } catch (error: any) {
      console.error("Erreur finance", error);
      if (error.response?.status === 401) {
          router.push('/login');
      } else {
          toast.error("Impossible de charger les données financières.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- 3. RETRAIT RAPIDE ---
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    
    const amount = parseInt(withdrawAmount);

    if (amount > data.walletBalance) {
      toast.error("Fonds insuffisants !");
      return;
    }
    if (amount < 1000) {
      toast.error("Minimum 1000 FCFA");
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ APPEL POST SÉCURISÉ (utilise route.ts validé précédemment)
      await api.post('/owner/withdraw', {
        amount: amount,
        paymentDetails: `MOBILE MONEY - ${phoneNumber}`
      });
      
      setSuccessMsg("Retrait initié avec succès !");
      setWithdrawAmount('');
      setPhoneNumber('');
      await fetchData(); // Rafraîchir le solde affiché
      
      setTimeout(() => { setIsModalOpen(false); setSuccessMsg(''); }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors du retrait.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 4. TABLEAU UNIFIÉ ---
  const transactions: FinanceItem[] = React.useMemo(() => {
    if (!data) return [];
    // Fusion et tri par date décroissante
    return [...(data.payments || []), ...(data.bookings || [])].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [data]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120]">
      <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
    </div>
  );

  const walletBalance = data?.walletBalance ?? 0;

  return (
    <main className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 font-sans pb-20 relative">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            💰 Mes Finances
            </h1>
            <p className="text-slate-400 text-sm mt-1">Vue consolidée de vos revenus immobiliers.</p>
        </div>
      </div>

      {/* CARTES STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {/* Carte Solde Dispo */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-6 rounded-[2rem] relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110">
                <Wallet size={100} />
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                    <TrendingUp size={20} />
                </div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Solde Disponible</h3>
            </div>
            <div className="text-4xl font-black text-white mb-2 tracking-tighter">
                {walletBalance.toLocaleString()} <span className="text-lg text-orange-500">FCFA</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-6">
                Net perçu (Commissions déduites).
            </p>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-orange-500 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest w-full hover:bg-orange-400 transition shadow-lg flex justify-center items-center gap-2 active:scale-95"
            >
                Retirer mes fonds
            </button>
        </div>

        {/* Carte Séquestre */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden shadow-lg">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <Lock size={20} />
                </div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Compte Séquestre</h3>
            </div>
            <div className="text-4xl font-black text-white mb-2 tracking-tighter">
                {(data?.escrowBalance ?? 0).toLocaleString()} <span className="text-lg text-slate-600">FCFA</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Total des cautions actives (Bloqué).</p>
        </div>

        {/* Carte Info Commissions */}
         <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-[2rem] relative overflow-hidden shadow-lg flex flex-col justify-center">
            <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-blue-400 shrink-0" />
                <div>
                    <h3 className="text-sm font-bold text-white mb-2">Structure des Commissions</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        • <span className="text-blue-400 font-bold">Location</span> : 5% (Gestion & Assurance).
                        <br/>
                        • <span className="text-purple-400 font-bold">Akwaba</span> : Variable selon la saison.
                        <br/>
                        • <span className="text-emerald-400 font-bold">Net</span> : Montant affiché dans votre solde.
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* --- TABLEAU UNIFIÉ --- */}
      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
        📥 Historique des Transactions
      </h3>

      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-lg">
        {transactions.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                        <tr>
                            <th className="p-6">Date</th>
                            <th className="p-6">Origine</th>
                            <th className="p-6">Détails</th>
                            <th className="p-6 text-right">Montant Brut</th>
                            <th className="p-6 text-right text-red-400">Com.</th>
                            <th className="p-6 text-right text-emerald-500">Net Reçu</th>
                            <th className="p-6 text-right">Document</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {transactions.map((tx, idx) => {
                            const isAkwaba = tx.source === 'AKWABA';
                            
                            const gross = tx.grossAmount;
                            const net = tx.amount;
                            const commission = gross - net;

                            const badgeLabel = isAkwaba ? "Court Séjour" : "Loyer";
                            const badgeColor = isAkwaba 
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                : "bg-blue-500/10 text-blue-500 border-blue-500/20";

                            const clientName = isAkwaba ? tx.details.guest : tx.details.tenant;
                            const propertyTitle = tx.details.property;

                            return (
                                <tr key={`${tx.source}-${tx.id}-${idx}`} className="hover:bg-slate-800/50 transition group">
                                    <td className="p-6 text-slate-400 font-medium">
                                        {new Date(tx.date).toLocaleDateString('fr-FR')}
                                    </td>
                                    
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${badgeColor}`}>
                                            {badgeLabel}
                                        </span>
                                    </td>

                                    <td className="p-6">
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {isAkwaba ? <Plane size={14} className="text-purple-400"/> : null}
                                            {clientName}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate max-w-[150px]">
                                            {propertyTitle}
                                        </div>
                                    </td>
                                    
                                    <td className="p-6 text-right font-mono text-slate-300 font-bold">
                                        {gross.toLocaleString()} F
                                    </td>

                                    <td className="p-6 text-right font-mono text-xs text-red-400 font-medium">
                                        -{commission.toLocaleString()} F
                                    </td>

                                    <td className="p-6 text-right font-mono font-black text-emerald-500 text-lg">
                                        +{net.toLocaleString()} F
                                    </td>

                                    <td className="p-6 text-right">
                                      {!isAkwaba && data?.user && (
                                        <div className="flex justify-end">
                                            <DownloadRentReceipt 
                                                payment={{
                                                    id: tx.id,
                                                    amount: tx.amount, // Net reçu
                                                    date: new Date(tx.date),
                                                    type: tx.type || 'LOYER'
                                                }} 
                                                lease={{ 
                                                    property: { title: propertyTitle }
                                                }}
                                                tenant={{ name: clientName || "Inconnu" }}
                                                property={{ title: propertyTitle }}
                                                owner={data.user} 
                                            />
                                        </div>
                                      )}
                                      {isAkwaba && (
                                          <div className="text-[10px] text-slate-600 font-mono text-right">
                                              REF: {tx.id.slice(-6).toUpperCase()}
                                          </div>
                                      )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="p-10 text-center flex flex-col items-center">
                <AlertCircle className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-slate-400">Aucune transaction enregistrée.</p>
            </div>
        )}
      </div>

      {/* MODALE DE RETRAIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-[#0F172A] border border-slate-700 w-full max-w-md rounded-[2rem] p-8 relative shadow-2xl animate-in zoom-in-95">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition bg-white/5 hover:bg-white/10 p-2 rounded-full">
                <X size={20} />
              </button>
              
              <div className="text-center mb-8">
                <div className="bg-orange-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/20 shadow-lg shadow-orange-500/10">
                    <span className="text-4xl">💸</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Retirer mes fonds</h2>
                <p className="text-slate-400 text-sm mt-1">Transfert instantané vers Mobile Money</p>
              </div>

              {!successMsg ? (
                <form onSubmit={handleWithdraw} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Montant à retirer</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder="Min: 1000"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white font-bold text-lg focus:border-orange-500 outline-none transition-colors placeholder:text-slate-700"
                                required
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">FCFA</span>
                        </div>
                        <p className="text-right text-[10px] text-slate-500 mt-2 font-bold">Disponible : {walletBalance.toLocaleString()} FCFA</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Numéro Bénéficiaire</label>
                        <div className="relative">
                             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                <Smartphone size={18} />
                             </div>
                             <input 
                                type="tel" 
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="07 07 00 11 22"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 pl-12 text-white font-bold text-lg focus:border-orange-500 outline-none transition-colors placeholder:text-slate-700"
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-4 rounded-xl shadow-xl shadow-orange-500/20 transition-all mt-4 disabled:opacity-50 flex justify-center items-center gap-2 active:scale-95 text-sm uppercase tracking-widest"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'CONFIRMER LE RETRAIT'}
                    </button>
                </form>
              ) : (
                <div className="py-8 text-center animate-in zoom-in">
                    <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
                    <h3 className="text-2xl font-black text-white mb-2">Retrait Validé !</h3>
                    <p className="text-slate-400 font-medium">{successMsg}</p>
                </div>
              )}
           </div>
        </div>
      )}
    </main>
  );
}
