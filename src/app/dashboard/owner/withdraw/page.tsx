"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ArrowLeft, Wallet, Loader2, AlertCircle, Phone, CheckCircle } from "lucide-react";
import Swal from "sweetalert2";

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

  // 1. CHARGEMENT DU SOLDE RÉEL AU DÉMARRAGE
  useEffect(() => {
    const fetchBalance = async () => {
      // ✅ SÉCURITÉ : On vérifie l'identité
      const stored = localStorage.getItem("immouser");
      if (!stored) {
        router.push('/login');
        return;
      }
      const user = JSON.parse(stored);

      try {
        // ✅ APPEL SÉCURISÉ (GET)
        const res = await api.get('/owner/finance', {
            headers: { 'x-user-email': user.email }
        });
        if (res.data.success) {
          setWalletBalance(res.data.walletBalance || 0);
        }
      } catch (error) {
        console.error("Erreur solde", error);
      } finally {
        setInitializing(false);
      }
    };
    fetchBalance();
  }, []);

  // 2. FONCTION "TOUT RETIRER" (MAX)
  const handleMax = () => {
    setAmount(walletBalance.toString());
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ SÉCURITÉ : On récupère l'user pour le POST aussi
    const stored = localStorage.getItem("immouser");
    if (!stored) return;
    const user = JSON.parse(stored);
    
    // --- VALIDATIONS ---
    const value = parseInt(amount);
    
    if (isNaN(value) || value <= 0) {
        return Swal.fire({ title: "Montant Invalide", text: "Veuillez saisir un montant positif.", icon: "warning", background: '#0f172a', color: '#fff' });
    }

    if (value > walletBalance) {
        return Swal.fire({ title: "Solde Insuffisant", text: `Vous ne pouvez pas retirer plus de ${walletBalance.toLocaleString()} F.`, icon: "error", background: '#0f172a', color: '#fff' });
    }

    if (phone.length < 10) {
        return Swal.fire({ title: "Numéro Invalide", text: "Le numéro doit comporter 10 chiffres.", icon: "warning", background: '#0f172a', color: '#fff' });
    }

    setLoading(true);

    try {
      // ✅ APPEL SÉCURISÉ (POST)
      const res = await api.post('/owner/withdraw', {
        amount: value,
        paymentDetails: `${method} - ${phone}` // Format pour l'admin
      }, {
        headers: { 'x-user-email': user.email }
      });

      if (res.data.success) {
        await Swal.fire({ 
            title: "Demande Envoyée 🚀", 
            text: "Votre virement sera traité sous 24h ouvrées.", 
            icon: "success",
            background: '#0f172a', color: '#fff',
            confirmButtonColor: '#F59E0B'
        });
        router.push('/dashboard/owner');
      }
    } catch (error: any) {
      Swal.fire({ 
          title: "Erreur Technique", 
          text: error.response?.data?.error || "Impossible de traiter la demande.", 
          icon: "error",
          background: '#0f172a', color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  if (initializing) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 md:p-10 text-white font-sans">
      
      {/* HEADER */}
      <button onClick={() => router.back()} className="flex items-center gap-2 mb-8 text-slate-400 hover:text-white transition group">
        <ArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Retour au Dashboard
      </button>

      <div className="max-w-md mx-auto">
        
        {/* TITRE */}
        <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                <Wallet className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Retrait de Fonds</h1>
            <p className="text-slate-400 text-sm mt-2">Transférez vos gains vers votre Mobile Money.</p>
        </div>

        {/* CARTE SOLDE */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-24 h-24 text-white"/></div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Solde Disponible</p>
             <p className="text-3xl font-black text-emerald-400">{walletBalance.toLocaleString()} <span className="text-lg text-emerald-600">FCFA</span></p>
        </div>
        
        {/* FORMULAIRE */}
        <form onSubmit={handleWithdraw} className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
          
          {/* Input Montant avec bouton MAX */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Montant à retirer</label>
            <div className="relative">
                <input 
                    type="number" 
                    placeholder="0" 
                    className="w-full bg-slate-950 p-4 pr-20 rounded-xl outline-none border border-slate-800 focus:border-orange-500 transition font-mono text-lg font-bold text-white placeholder:text-slate-700"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    max={walletBalance}
                />
                <button 
                    type="button"
                    onClick={handleMax}
                    className="absolute right-2 top-2 bottom-2 bg-slate-800 hover:bg-slate-700 text-orange-500 text-xs font-bold px-3 rounded-lg border border-slate-700 transition"
                >
                    MAX
                </button>
            </div>
            {parseInt(amount) > walletBalance && (
                <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Solde insuffisant</p>
            )}
          </div>

          {/* Sélection Opérateur */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Opérateur Mobile</label>
            <div className="grid grid-cols-3 gap-2">
                {['WAVE', 'OM', 'MOMO'].map((op) => (
                    <button
                        key={op}
                        type="button"
                        onClick={() => setMethod(op)}
                        className={`py-3 rounded-xl text-sm font-bold border transition ${
                            method === op 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                        }`}
                    >
                        {op}
                    </button>
                ))}
            </div>
          </div>

          {/* Numéro Téléphone */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Numéro Bénéficiaire</label>
            <div className="relative">
                <Phone className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                <input 
                    type="tel" 
                    placeholder="07 07 ..." 
                    className="w-full bg-slate-950 p-4 pl-12 rounded-xl outline-none border border-slate-800 focus:border-orange-500 transition font-mono text-white placeholder:text-slate-700"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} // Que des chiffres
                    maxLength={10}
                />
                {phone.length === 10 && (
                    <CheckCircle className="absolute right-4 top-4 w-5 h-5 text-emerald-500" />
                )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || parseInt(amount) > walletBalance || parseInt(amount) <= 0}
            className="w-full bg-orange-500 text-black font-black py-4 rounded-xl hover:bg-orange-400 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
          >
            {loading ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : "CONFIRMER LE RETRAIT"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Frais de transaction : 0% (Offert par ImmoFacile)
          </p>
        </form>
      </div>
    </div>
  );
}
