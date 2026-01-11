"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // ✅ Indispensable pour la redirection
import { api } from "@/lib/api";
import { 
  Wallet, TrendingUp, Lock, 
  AlertCircle, X, Smartphone, CheckCircle, 
  Info, Loader2
} from "lucide-react";
import DownloadRentReceipt from "@/components/documents/DownloadRentReceipt";

// Interfaces
interface Payment {
  id: string;
  amount: number;
  type: string;
  status: string;
  date: string;
  lease: {
    id: string;
    property: { title: string; [key: string]: any };
    tenant: { name: string; [key: string]: any };
    [key: string]: any;
  };
}

interface FinanceData {
  walletBalance: number;
  escrowBalance: number;
  payments: Payment[];
  user: any;
}

export default function OwnerFinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinanceData | null>(null);

  // États pour la Modale de Retrait
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Chargement des données
  const fetchData = async () => {
    // 1. SÉCURITÉ : Récupération de l'utilisateur
    const stored = localStorage.getItem("immouser");
    if (!stored) {
        router.push('/login'); // Redirection si pas connecté
        return;
    }
    const user = JSON.parse(stored);

    try {
      // 2. APPEL SÉCURISÉ (Avec Header)
      const res = await api.get('/owner/finance', {
        headers: { 'x-user-email': user.email }
      });
      setData(res.data);
    } catch (error) {
      console.error("Erreur finance", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Gestion du Retrait
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    // Sécurité aussi pour le retrait
    const stored = localStorage.getItem("immouser");
    if (!stored) return;
    const user = JSON.parse(stored);

    const amount = parseInt(withdrawAmount);

    if (amount > data.walletBalance) {
      alert("Fonds insuffisants !");
      return;
    }
    if (amount < 1000) {
      alert("Le retrait minimum est de 1000 FCFA");
      return;
    }

    setIsSubmitting(true);
    try {
      // 3. POST SÉCURISÉ (Avec Header)
      await api.post('/owner/withdraw', {
        amount: amount,
        paymentDetails: phoneNumber
      }, {
        headers: { 'x-user-email': user.email }
      });

      setSuccessMsg("Retrait initié avec succès !");
      setWithdrawAmount('');
      setPhoneNumber('');
      
      // On rafraîchit les données pour voir le solde baisser
      await fetchData();

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
      }, 2000);

    } catch (error) {
      console.error(error);
      alert("Erreur lors du retrait.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120]">
      <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
    </div>
  );

  const walletBalance = data?.walletBalance || 0;

  return (
    <main className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 font-sans pb-20 relative">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            💰 Mes Finances
            </h1>
            <p className="text-slate-400 text-sm mt-1">Suivi de la trésorerie et des loyers encaissés.</p>
        </div>
      </div>

      {/* CARTES STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        
        {/* CARTE 1 : PORTEFEUILLE DISPONIBLE */}
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
                Montant net après déduction des commissions.
            </p>
            
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-orange-500 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest w-full hover:bg-orange-400 transition shadow-lg flex justify-center items-center gap-2"
            >
                Retirer mes fonds
            </button>
        </div>

        {/* CARTE 2 : CAUTIONS BLOQUÉES (ESCROW) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden shadow-lg">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <Lock size={20} />
                </div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Compte Séquestre</h3>
            </div>
            <div className="text-4xl font-black text-white mb-2 tracking-tighter">
                {data?.escrowBalance.toLocaleString()} <span className="text-lg text-slate-600">FCFA</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Fonds bloqués (Cautions)</p>
        </div>

         {/* CARTE 3 : INFO PÉDAGOGIQUE */}
         <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-[2rem] relative overflow-hidden shadow-lg flex flex-col justify-center">
            <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-blue-400 shrink-0" />
                <div>
                    <h3 className="text-sm font-bold text-white mb-2">Comprendre mes revenus</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Le solde disponible correspond à vos encaissements <span className="text-white font-bold">nets</span>.
                        <br/><br/>
                        • <span className="text-orange-400">Frais dossier</span> : 100% Plateforme.
                        <br/>
                        • <span className="text-blue-400">Loyers</span> : 5% de commission déduite.
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* TABLEAU DES TRANSACTIONS */}
      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
        📥 Historique & Répartition
      </h3>

      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-lg">
        {data?.payments && data.payments.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                        <tr>
                            <th className="p-6">Date</th>
                            <th className="p-6">Locataire</th>
                            <th className="p-6">Type</th>
                            <th className="p-6 text-right">Montant Payé</th>
                            <th className="p-6 text-right text-red-400">Commission</th>
                            <th className="p-6 text-right text-emerald-500">Net Perçu</th>
                            <th className="p-6 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {data.payments.map((pay) => {
                            // --- LOGIQUE VISUELLE DE CALCUL ---
                            // Détection basée sur le montant (doit matcher la logique Backend)
                            const isFraisDossier = pay.amount <= 25000;
                            
                            // Calculs théoriques pour l'affichage
                            let commission = 0;
                            let net = 0;

                            if (isFraisDossier) {
                                // Cas 20 000 : Tout pour la plateforme
                                commission = pay.amount;
                                net = 0;
                            } else {
                                // Cas Loyer : 5% plateforme
                                commission = pay.amount * 0.05;
                                net = pay.amount - commission;
                            }

                            return (
                                <tr key={pay.id} className="hover:bg-slate-800/50 transition group">
                                    <td className="p-6 text-slate-400 font-medium">
                                        {new Date(pay.date).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="p-6">
                                        <div className="font-bold text-white">{pay.lease.tenant.name}</div>
                                        <div className="text-xs text-slate-500">{pay.lease.property.title}</div>
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                                            isFraisDossier 
                                            ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' 
                                            : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                        }`}>
                                            {isFraisDossier ? 'Frais Dossier' : 'Loyer'}
                                        </span>
                                    </td>
                                    
                                    {/* COLONNE 1 : MONTANT PAYÉ PAR LOCATAIRE */}
                                    <td className="p-6 text-right font-mono text-slate-300 font-bold">
                                        {pay.amount.toLocaleString()} F
                                    </td>

                                    {/* COLONNE 2 : COMMISSION (DEDUCTION) */}
                                    <td className="p-6 text-right font-mono text-xs text-red-400 font-medium">
                                        -{commission.toLocaleString()} F
                                    </td>

                                    {/* COLONNE 3 : NET PERÇU (POCHE PROPRIO) */}
                                    <td className="p-6 text-right font-mono font-black text-emerald-500 text-lg">
                                        +{net.toLocaleString()} F
                                    </td>

                                    <td className="p-6 text-right">
                                      <div className="flex justify-end">
                                        <DownloadRentReceipt 
                                            payment={pay}
                                            lease={pay.lease}
                                            tenant={pay.lease.tenant}
                                            property={pay.lease.property}
                                            owner={data.user} 
                                        />
                                      </div>
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
                <p className="text-slate-400">Aucun paiement enregistré pour le moment.</p>
            </div>
        )}
      </div>

      {/* --- MODALE DE RETRAIT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-[#0F172A] border border-slate-700 w-full max-w-md rounded-[2rem] p-8 relative shadow-2xl animate-in zoom-in-95">
              
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition bg-white/5 hover:bg-white/10 p-2 rounded-full"
              >
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
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmer le retrait'}
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
