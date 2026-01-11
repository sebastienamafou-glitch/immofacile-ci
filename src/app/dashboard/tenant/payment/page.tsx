"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, ArrowLeft, Smartphone, ShieldCheck, CheckCircle2, FileText } from "lucide-react";
import Swal from "sweetalert2";
import Link from "next/link";
import { toast } from "sonner"; // J'ai ajouté le toast pour une meilleure UX

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const paramAmount = searchParams.get('amount');
  const paramType = searchParams.get('type');
  const paramId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lease, setLease] = useState<any>(null);
  const [provider, setProvider] = useState("WAVE");
  const [phone, setPhone] = useState("");
  // ✅ NOUVEAU : On stocke l'email de l'utilisateur
  const [userEmail, setUserEmail] = useState("");

  const isFee = paramType?.includes('FRAIS');
  const amountToPay = paramAmount ? parseInt(paramAmount) : (lease?.monthlyRent || 0);
  const pageTitle = isFee ? "Frais de Dossier" : "Paiement de Loyer";

  useEffect(() => {
    const fetchLeaseInfo = async () => {
      try {
        // 1. SÉCURITÉ : On récupère l'utilisateur
        const storedUser = localStorage.getItem("immouser");
        if (!storedUser) {
            router.push("/login");
            return;
        }
        const currentUser = JSON.parse(storedUser);
        setUserEmail(currentUser.email); // On garde l'email pour plus tard

        // 2. APPEL API AVEC HEADERS
        const res = await api.get('/tenant/dashboard', {
            headers: { 'x-user-email': currentUser.email } // ✅ C'est la ligne magique !
        });

        if (res.data.success && res.data.lease) {
            setLease(res.data.lease);
            if(res.data.user?.phone) setPhone(res.data.user.phone);
        } else {
             // Si pas de bail, on redirige gentiment
             toast.error("Aucun bail actif trouvé.");
             router.push('/dashboard/tenant');
        }
      } catch (error) {
        console.error("Erreur chargement bail:", error);
        toast.error("Erreur de connexion.");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaseInfo();
  }, [router]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const endpoint = isFee ? '/tenant/pay-fees' : '/tenant/pay-rent';
      
      const res = await api.post(endpoint, {
        leaseId: lease.id,
        paymentId: paramId, 
        amount: amountToPay,
        provider: provider,
        phone: phone
      }, {
        // ✅ IMPORTANT : On passe aussi le header ici pour le POST
        headers: { 'x-user-email': userEmail } 
      });

      if (res.data.success) {
        await Swal.fire({
            icon: 'success',
            title: 'Paiement Réussi !',
            text: isFee ? 'Vos frais ont été réglés.' : 'Votre quittance a été générée.',
            confirmButtonColor: '#F59E0B',
            background: '#0B1120', color: '#fff'
        });
        router.push('/dashboard/tenant/payments'); 
      }
    } catch (error: any) {
         Swal.fire({
            icon: 'error',
            title: 'Échec du paiement',
            text: error.response?.data?.error || 'Une erreur est survenue.',
            background: '#0B1120', color: '#fff'
         });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#F59E0B] w-12 h-12 mb-4"/>
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Chargement sécurisé...</p>
    </div>
  );

  return (
    <div className="w-full max-w-lg bg-[#0F172A] border border-white/5 rounded-[2.5rem] shadow-2xl relative z-10">
        
        <div className="p-8 pb-4">
            <Link href="/dashboard/tenant" className="text-slate-500 hover:text-white flex items-center gap-2 mb-8 text-[10px] transition-all font-black uppercase tracking-[0.2em] group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Annuler
            </Link>
            
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">{pageTitle}</h1>
                    <p className="text-slate-500 text-xs mt-1 font-medium">Référence : <span className="font-mono text-slate-400">#{paramType || `LOY-${new Date().getMonth()+1}`}</span></p>
                </div>
                <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-lg shadow-orange-500/5">
                    {isFee ? <FileText className="w-7 h-7 text-orange-500" /> : <ShieldCheck className="w-7 h-7 text-orange-500" />}
                </div>
            </div>
        </div>

        <div className="px-8 pb-10 space-y-8">
            <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl group-hover:bg-orange-500/10 transition-colors"></div>
                <div className="flex justify-between items-end relative z-10">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Total à payer</p>
                        <p className="text-xs text-orange-500/80 font-bold mb-1">{lease?.property?.title}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-black text-white tracking-tighter">
                            {amountToPay.toLocaleString()} 
                            <span className="text-sm font-bold text-slate-600 ml-1">CFA</span>
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handlePayment} className="space-y-8">
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Moyen de paiement</p>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'WAVE', label: 'Wave', color: 'bg-blue-500', sub: '225' },
                          { id: 'OM', label: 'Orange', color: 'bg-orange-600', sub: 'OM' },
                          { id: 'MTN', label: 'MTN', color: 'bg-yellow-400', sub: 'MoMo' }
                        ].map((p) => (
                            <button 
                                key={p.id}
                                type="button"
                                onClick={() => setProvider(p.id)}
                                className={`group p-4 rounded-[1.5rem] border transition-all duration-300 flex flex-col items-center gap-3 ${
                                    provider === p.id 
                                    ? 'bg-white/5 border-orange-500 shadow-[0_0_25px_rgba(245,158,11,0.1)]' 
                                    : 'bg-transparent border-white/5 opacity-40 hover:opacity-100 hover:border-white/10'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-lg ${p.color}`}>
                                    {p.sub.charAt(0)}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${provider === p.id ? 'text-white' : 'text-slate-500'}`}>
                                    {p.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Numéro de débit</label>
                    <div className="relative">
                        <Smartphone className="absolute left-5 top-5 h-5 w-5 text-slate-600" />
                        <input 
                            placeholder="07 00 00 00 00" 
                            className="w-full pl-14 h-16 bg-slate-950/50 border border-white/5 rounded-2xl text-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-mono font-bold text-lg placeholder:text-slate-700"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                        {phone.length >= 10 && (
                            <CheckCircle2 className="absolute right-5 top-5 h-5 w-5 text-emerald-500" />
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={processing}
                        className="w-full h-20 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-black text-xl rounded-[1.5rem] shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all flex flex-col items-center justify-center disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
                    >
                        {processing ? (
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span className="uppercase tracking-widest text-sm">Traitement...</span>
                            </div>
                        ) : (
                            <>
                                <span>CONFIRMER {amountToPay.toLocaleString()} F</span>
                                <span className="text-[10px] opacity-70 font-bold tracking-[0.3em] mt-1 italic">CRYPTAGE SSL ACTIF</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
}

export default function PaymentPageWrapper() {
  return (
    <div className="min-h-screen bg-[#060B18] text-slate-200 p-4 md:p-8 flex items-center justify-center font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full"></div>
      
      <Suspense fallback={<div className="text-white">Chargement...</div>}>
        <PaymentContent />
      </Suspense>
    </div>
  );
}
