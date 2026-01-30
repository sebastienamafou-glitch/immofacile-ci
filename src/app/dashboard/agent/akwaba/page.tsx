"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Loader2, LogIn, LogOut, Key, MapPin, Phone, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { api } from "@/lib/api"; // ✅ Wrapper Sécurisé

interface Movement {
    id: string;
    type: 'CHECK_IN' | 'CHECK_OUT';
    date: string;
    listing: { title: string; address: string };
    guest: { name: string; phone?: string; image?: string };
}

export default function ConciergeriePage() {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<Movement[]>([]);

  // 1. CHARGEMENT (ZERO TRUST)
  useEffect(() => {
    async function load() {
      try {
        // ✅ Appel sécurisé (Cookie auto)
        const res = await api.get('/agent/akwaba/concierge');
        if (res.data.success) {
            setMovements(res.data.movements);
        }
      } catch (e: any) {
        console.error(e);
        toast.error("Erreur de chargement du planning.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 2. ACTION : CHECK-IN / CHECK-OUT
  const handleAction = async (bookingId: string, type: 'CHECK_IN' | 'CHECK_OUT') => {
      // Nous utiliserons probablement un endpoint dédié pour l'action
      // Je sécurise l'appel ici en prévision
      const loadingToast = toast.loading("Traitement en cours...");
      
      try {
        // ✅ POST Sécurisé
        const res = await api.post('/agent/akwaba/concierge/action', { 
            bookingId, 
            action: type 
        });

        if (res.data.success) {
            toast.success(res.data.message || "Action validée !");
            // Rafraîchissement
            window.location.reload();
        }
      } catch (e: any) {
        const msg = e.response?.data?.error || "Action impossible";
        toast.error(msg);
      } finally {
        toast.dismiss(loadingToast);
      }
  };

  if (loading) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto pb-24 bg-[#0B1120] min-h-screen text-slate-200">
        
        <div className="mb-8 border-b border-slate-800 pb-6">
            <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                <Key className="text-orange-500 w-8 h-8" /> Conciergerie
            </h1>
            <p className="text-slate-400 mt-2">Gérez les arrivées et départs de la semaine pour votre agence.</p>
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {movements.length === 0 ? (
                <div className="p-12 bg-slate-900 border border-slate-800 border-dashed rounded-3xl text-center flex flex-col items-center gap-4">
                    <CheckCircle2 className="w-12 h-12 text-slate-700" />
                    <div>
                        <h3 className="text-white font-bold text-lg">Tout est calme</h3>
                        <p className="text-slate-500">Aucun mouvement prévu pour les 7 prochains jours.</p>
                    </div>
                </div>
            ) : (
                movements.map((mov) => (
                    <div key={mov.id + mov.type} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center hover:border-orange-500/50 transition group shadow-lg">
                        
                        {/* DATE & TYPE */}
                        <div className="flex flex-col items-center justify-center min-w-[120px] md:border-r border-slate-800 md:pr-6 w-full md:w-auto pb-4 md:pb-0 border-b md:border-b-0">
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
                                {format(new Date(mov.date), 'EEE d MMM', { locale: fr })}
                            </span>
                            <div className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-2 border ${
                                mov.type === 'CHECK_IN' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                                {mov.type === 'CHECK_IN' ? <LogIn size={14}/> : <LogOut size={14}/>}
                                {mov.type === 'CHECK_IN' ? 'ARRIVÉE' : 'DÉPART'}
                            </div>
                        </div>

                        {/* INFO BIEN & GUEST */}
                        <div className="flex-1 w-full text-center md:text-left">
                            <h3 className="text-white font-bold text-xl mb-1 truncate">{mov.listing.title}</h3>
                            <p className="text-slate-400 text-sm flex items-center justify-center md:justify-start gap-1 mb-4">
                                <MapPin size={14} className="text-orange-500"/> {mov.listing.address}
                            </p>
                            
                            <div className="flex items-center justify-center md:justify-start gap-3 bg-slate-950/50 p-2 rounded-xl w-fit mx-auto md:mx-0 border border-slate-800/50">
                                <Avatar className="w-9 h-9 border border-slate-700">
                                    <AvatarImage src={mov.guest.image} />
                                    <AvatarFallback className="bg-slate-800 text-slate-400 font-bold">{mov.guest.name?.substring(0,1)}</AvatarFallback>
                                </Avatar>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-white leading-tight">{mov.guest.name}</p>
                                    <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                                        <Phone size={10}/> {mov.guest.phone || "Non renseigné"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ACTIONS CONNECTÉES */}
                        <div className="flex flex-col gap-2 min-w-[160px] w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 text-center md:text-left">Action requise</p>
                            <Button 
                                className={`w-full font-bold shadow-lg transition-transform active:scale-95 ${
                                    mov.type === 'CHECK_IN' 
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                                }`}
                                onClick={() => handleAction(mov.id, mov.type)}
                            >
                                {mov.type === 'CHECK_IN' ? 'Valider Check-in' : 'Valider Check-out'}
                            </Button>
                        </div>

                    </div>
                ))
            )}
        </div>

    </div>
  );
}
