"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ArrowLeft, Wallet, Loader2, AlertCircle, Phone, CheckCircle } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";

export default function WithdrawalPage() {
  const router = useRouter();
  
  // États
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Formulaire
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("WAVE");
  const [phone, setPhone] = useState("");

  // 1. CHARGEMENT DU SOLDE (ZERO TRUST)
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        // ✅ APPEL SÉCURISÉ : Auth via Cookie
        // Note: Cette route doit exister dans api/owner/finance/route.ts
        const res = await api.get('/owner/finance');
        if (res.data.success) {
          setWalletBalance(res.data.walletBalance || 0);
        }
      } catch (error: any) {
        console.error("Erreur solde", error);
        if (error.response?.status === 401) {
            router.push('/login');
        } else {
            toast.error("Impossible de récupérer votre solde.");
        }
      } finally {
        setInitializing(false);
      }
    };
    fetchBalance();
  }, [router]);

  // 2. FONCTION "TOUT RETIRER" (MAX)
  const handleMax = () => {
    setAmount(walletBalance.toString());
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- VALIDATIONS LOCALES ---
    const value = parseInt(amount);
    
    if (isNaN(value) || value <= 0) {
        return Swal.fire({ title: "Montant Invalide", text: "Veuillez saisir un montant positif.", icon: "warning", background: '#0f172a', color: '#fff' });
    }

    if (value > walletBalance) {
        return Swal.fire({ title: "Solde Insuffisant", text: `Votre solde est de ${walletBalance.toLocaleString()} F.`, icon: "error", background: '#0f172a', color: '#fff' });
    }

    if (phone.length < 10) {
        return Swal.fire({ title: "Numéro Invalide", text: "Le numéro doit comporter 10 chiffres.", icon: "warning", background: '#0f172a', color: '#fff' });
    }

    setLoading(true);

    try {
      // ✅ APPEL SÉCURISÉ : Pas de headers manuels
      const res = await api.post('/owner/withdraw', {
        amount: value,
        paymentDetails: `${method} - ${phone}` 
      });

      if (res.data.success) {
        await Swal.fire({ 
            title: "Demande Validée 🔒", 
            text: "Votre demande de retrait a été enregistrée et sécurisée. Le virement sera effectué sous 24h.", 
            icon: "success",
            background: '#0f172a', color: '#fff',
            confirmButtonColor: '#F59E0B'
        });
        router.push('/dashboard/owner');
      }
    } catch (error: any) {
      Swal.fire({ 
          title: "Échec Transaction", 
          text: error.response?.data?.error || "Erreur bancaire. Veuillez réessayer.", 
          icon: "error",
          background: '#0f172a', color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  if (initializing) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-[#F59E0B] w-12 h-12"/></div>;

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 md:p-10 text-white font-sans">
      
      {/* HEADER */}
      <button onClick={() => router.back()} className="flex items-center gap-2 mb-8 text-slate-400 hover:text-white transition group">
        <ArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Retour au Dashboard
      </button>

      <div className="max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-500">
        
        {/* TITRE */}
        <div className="mb-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#F59E0B] to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-orange-500/20">
                <Wallet className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tight uppercase">Guichet Retrait</h1>
            <p className="text-slate-400 text-sm mt-2">Transfert sécurisé vers Mobile Money</p>
        </div>

        {/* CARTE SOLDE */}
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] mb-6 relative overflow-hidden shadow-xl">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-32 h-32 text-white"/></div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Solde Disponible
             </p>
             <p className="text-4xl font-black text-white">{walletBalance.toLocaleString()} <span className="text-xl text-emerald-500">FCFA</span></p>
        </div>
        
        {/* FORMULAIRE */}
        <form onSubmit={handleWithdraw} className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-xl space-y-6">
          
          {/* Input Montant */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Montant à retirer</label>
            <div className="relative group">
                <input 
                    type="number" 
                    placeholder="0" 
                    className="w-full bg-slate-950 p-5 pr-20 rounded-2xl outline-none border border-slate-800 focus:border-[#F59E0B] transition-colors font-mono text-xl font-bold text-white placeholder:text-slate-700"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
                <button 
                    type="button"
                    onClick={handleMax}
                    className="absolute right-3 top-3 bottom-3 bg-slate-800 hover:bg-slate-700 text-[#F59E0B] text-xs font-black px-4 rounded-xl border border-slate-700 transition"
                >
                    MAX
                </button>
            </div>
            {parseInt(amount) > walletBalance && (
                <p className="text-red-500 text-xs flex items-center gap-1 font-bold animate-pulse"><AlertCircle className="w-3 h-3"/> Solde insuffisant</p>
            )}
          </div>

          {/* Opérateur */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Opérateur Mobile</label>
            <div className="grid grid-cols-3 gap-3">
                {['WAVE', 'OM', 'MOMO'].map((op) => (
                    <button
                        key={op}
                        type="button"
                        onClick={() => setMethod(op)}
                        className={`py-4 rounded-xl text-sm font-black border transition-all active:scale-95 ${
                            method === op 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-white hover:border-slate-600'
                        }`}
                    >
                        {op}
                    </button>
                ))}
            </div>
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Numéro Bénéficiaire</label>
            <div className="relative group">
                <Phone className="absolute left-5 top-5 w-5 h-5 text-slate-500 group-focus-within:text-[#F59E0B] transition-colors" />
                <input 
                    type="tel" 
                    placeholder="07 07 ..." 
                    className="w-full bg-slate-950 p-5 pl-14 rounded-2xl outline-none border border-slate-800 focus:border-[#F59E0B] transition-colors font-mono text-lg text-white placeholder:text-slate-700 font-bold"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={10}
                />
                {phone.length === 10 && (
                    <CheckCircle className="absolute right-5 top-5 w-5 h-5 text-emerald-500 shadow-emerald-500/50 drop-shadow-lg" />
                )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || parseInt(amount) > walletBalance || parseInt(amount) <= 0 || phone.length < 10}
            className="w-full bg-[#F59E0B] text-black font-black py-5 rounded-2xl hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 active:scale-95 mt-4"
          >
            {loading ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : "CONFIRMER LE VIREMENT"}
          </button>

          <p className="text-center text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            🔒 Transaction sécurisée SSL 256-bit
          </p>
        </form>
      </div>
    </div>
  );
}
