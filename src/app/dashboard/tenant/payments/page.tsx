"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, Receipt, Download, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TenantPaymentsHistoryPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        // 1. SÉCURITÉ : Récupération User
        const storedUser = localStorage.getItem("immouser");
        if (!storedUser) {
            router.push("/login");
            return;
        }
        const currentUser = JSON.parse(storedUser);

        // 2. APPEL API AVEC HEADERS (Indispensable pour éviter le 401/404)
        const res = await api.get('/tenant/dashboard', {
            headers: { 'x-user-email': currentUser.email }
        });

        if (res.data.success) {
            setPayments(res.data.payments || []);
        }
      } catch (error) {
        console.error(error);
        toast.error("Impossible de charger l'historique.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [router]);

  const handleDownload = (id: string) => {
      toast.info("Téléchargement du reçu en cours...");
      // Ici vous pourrez brancher la génération PDF plus tard
  };

  if (loading) return <div className="min-h-screen bg-[#060B18] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 font-sans">
        <h1 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
            <Receipt className="text-emerald-500" /> Historique des Paiements
        </h1>

        <div className="bg-[#0F172A] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            {payments.length > 0 ? (
                <div className="divide-y divide-white/5">
                    {payments.map((p) => (
                        <div key={p.id} className="p-6 flex flex-col md:flex-row items-center justify-between hover:bg-white/5 transition group">
                            
                            {/* INFO GAUCHE */}
                            <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                                    p.status === 'PAID' || p.status === 'SUCCESS' 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                                    : 'bg-red-500/10 border-red-500/20 text-red-500'
                                }`}>
                                    {p.status === 'PAID' || p.status === 'SUCCESS' ? <CheckCircle className="w-6 h-6"/> : <XCircle className="w-6 h-6"/>}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white uppercase">{p.type === 'LOYER' ? 'Loyer Mensuel' : 'Frais Annexes'}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                                        <Calendar className="w-3 h-3"/> {new Date(p.date).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                            </div>

                            {/* INFO DROITE */}
                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right">
                                    <p className="text-xl font-black text-white font-mono">{p.amount.toLocaleString()} F</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{p.method || "MOBILE MONEY"}</p>
                                </div>
                                <Button 
                                    onClick={() => handleDownload(p.id)} 
                                    variant="outline" 
                                    className="border-slate-700 hover:bg-slate-800 text-slate-300 h-10 w-10 p-0 rounded-xl"
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                        <AlertCircle className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">Aucun historique</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                        Vos futurs paiements de loyer apparaîtront ici une fois validés.
                    </p>
                </div>
            )}
        </div>
    </div>
  );
}
