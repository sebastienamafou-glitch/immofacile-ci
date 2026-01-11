"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  ArrowLeft, Printer, CheckCircle2, 
  Building2, User, Calendar, Receipt, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PaymentReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const [payment, setPayment] = useState<any>(null);
  const [lease, setLease] = useState<any>(null); // Pour avoir les infos du bien/bailleur
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. SÉCURITÉ : Récupération User
        const storedUser = localStorage.getItem("immouser");
        if (!storedUser) {
            router.push("/login");
            return;
        }
        const currentUser = JSON.parse(storedUser);

        // 2. APPEL API AVEC HEADERS (La correction est ici ⬇️)
        const res = await api.get('/tenant/dashboard', {
            headers: { 'x-user-email': currentUser.email }
        });

        if (res.data.success) {
          // On cherche le paiement correspondant à l'ID de l'URL dans l'historique
          const foundPayment = res.data.payments?.find((p: any) => p.id === params.id);
          
          if (foundPayment) {
            setPayment(foundPayment);
            setLease(res.data.lease);
          } else {
            toast.error("Document introuvable.");
            router.push('/dashboard/tenant/payments');
          }
        }
      } catch (error) {
        console.error("Erreur quittance:", error);
        toast.error("Impossible de charger la quittance.");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchData();
  }, [params.id, router]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
    </div>
  );

  if (!payment) return null;

  return (
    <main className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 relative font-sans print:bg-white print:p-0">
      
      {/* HEADER DE NAVIGATION (Caché à l'impression) */}
      <div className="max-w-3xl mx-auto mb-8 flex justify-between items-center print:hidden">
         <button 
            onClick={() => router.push('/dashboard/tenant/payments')} 
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors group"
        >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Retour liste
        </button>
        <Button 
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest gap-2"
        >
            <Printer className="w-4 h-4" /> Imprimer / PDF
        </Button>
      </div>

      {/* TICKET DE QUITTANCE */}
      <div className="max-w-3xl mx-auto bg-white text-slate-900 rounded-[2rem] overflow-hidden shadow-2xl print:shadow-none print:rounded-none">
        
        {/* En-tête du Ticket */}
        <div className="bg-slate-950 text-white p-10 relative overflow-hidden print:bg-slate-950 print:text-white print:-webkit-print-color-adjust-exact">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-black italic text-xl tracking-tighter">IMMOFACILE</span>
                    </div>
                    <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Reçu de paiement numérique</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 font-mono mb-1">RÉFÉRENCE</p>
                    <p className="font-mono font-bold text-white tracking-widest">{payment.reference || `#PAY-${payment.id.substring(0,6)}`}</p>
                </div>
            </div>

            <div className="mt-10 flex items-center gap-4">
                 <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-8 h-8" />
                 </div>
                 <div>
                    <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-1">Statut Transaction</p>
                    <p className="text-3xl font-black text-white tracking-tight">PAYÉ AVEC SUCCÈS</p>
                 </div>
            </div>
        </div>

        {/* Corps du Ticket */}
        <div className="p-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-8 mb-10">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <User className="w-3 h-3" /> Locataire
                    </p>
                    <p className="font-bold text-slate-900 text-sm">{lease?.tenant?.name || "Client"}</p>
                    <p className="text-xs text-slate-500">{lease?.tenant?.phone}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Date de valeur
                    </p>
                    <p className="font-bold text-slate-900 text-sm">
                        {new Date(payment.date).toLocaleDateString('fr-FR', { dateStyle: 'full' })}
                    </p>
                    <p className="text-xs text-slate-500">
                        {new Date(payment.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>

            <div className="border-t-2 border-dashed border-slate-200 my-8"></div>

            <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Description</span>
                    <span className="text-slate-900 font-bold uppercase">
                        {payment.reference?.includes('FRAIS') ? 'Frais de Dossier & Gestion' : 'Loyer Habitation'}
                    </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Période</span>
                    <span className="text-slate-900 font-bold">
                        {new Date(payment.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Moyen de paiement</span>
                    <span className="text-slate-900 font-bold">Mobile Money (Wave/OM)</span>
                </div>
            </div>

            <div className="border-t-2 border-slate-900 mt-8 pt-6">
                <div className="flex justify-between items-end">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Montant Total Payé</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                        {payment.amount.toLocaleString()} <span className="text-lg text-slate-400 font-normal">FCFA</span>
                    </p>
                </div>
            </div>

            {/* Footer Ticket */}
            <div className="mt-12 text-center">
                <Receipt className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Document certifié par ImmoFacile CI</p>
                <p className="text-[9px] text-slate-300 font-mono mt-1 break-all">ID: {payment.id} • HASH: {payment.reference}</p>
            </div>
        </div>
      </div>
    </main>
  );
}
