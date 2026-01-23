"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Loader2, LogIn, LogOut, Key, MapPin, Phone 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner"; // ✅ Ajout pour les notifications

export default function ConciergeriePage() {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<any[]>([]);

  // 1. CHARGEMENT DES MOUVEMENTS
  useEffect(() => {
    async function load() {
      try {
        const stored = localStorage.getItem("immouser");
        const userEmail = stored ? JSON.parse(stored).email : "";
        
        const res = await fetch('/api/agent/akwaba/concierge', {
            headers: { 'x-user-email': userEmail }
        });
        const json = await res.json();
        if (json.success) setMovements(json.movements);
      } catch (e) {
        console.error(e);
        toast.error("Erreur de chargement du planning");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 2. ACTION : CHECK-IN / CHECK-OUT
  const handleAction = async (bookingId: string, type: 'CHECK_IN' | 'CHECK_OUT') => {
      const loadingToast = toast.loading("Traitement en cours...");
      try {
        const stored = localStorage.getItem("immouser");
        const userEmail = stored ? JSON.parse(stored).email : "";

        const res = await fetch('/api/agent/akwaba/concierge/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail },
            body: JSON.stringify({ bookingId, action: type })
        });

        const json = await res.json();

        if (res.ok) {
            toast.success(json.message);
            // On recharge la page pour mettre à jour la liste
            setTimeout(() => window.location.reload(), 1000);
        } else {
            toast.error(json.error || "Action impossible");
        }
      } catch (e) {
        toast.error("Erreur de connexion");
      } finally {
        toast.dismiss(loadingToast);
      }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
        
        <div className="mb-8">
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <Key className="text-orange-500" /> Conciergerie
            </h1>
            <p className="text-slate-400">Gérez les arrivées et départs de la semaine.</p>
        </div>

        <div className="space-y-4">
            {movements.length === 0 ? (
                <div className="p-10 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500">
                    Aucun mouvement (Arrivée/Départ) prévu cette semaine.
                </div>
            ) : (
                movements.map((mov) => (
                    <div key={mov.id + mov.type} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-6 items-center hover:border-orange-500/30 transition group">
                        
                        {/* DATE & TYPE */}
                        <div className="flex flex-col items-center min-w-[100px] border-r border-white/5 pr-6">
                            <span className="text-sm font-bold text-slate-500 uppercase">
                                {format(new Date(mov.date), 'EEE d MMM', { locale: fr })}
                            </span>
                            <div className={`mt-2 px-3 py-1 rounded-full text-xs font-black flex items-center gap-2 ${
                                mov.type === 'CHECK_IN' 
                                ? 'bg-emerald-500/10 text-emerald-500' 
                                : 'bg-orange-500/10 text-orange-500'
                            }`}>
                                {mov.type === 'CHECK_IN' ? <LogIn size={12}/> : <LogOut size={12}/>}
                                {mov.type === 'CHECK_IN' ? 'ARRIVÉE' : 'DÉPART'}
                            </div>
                        </div>

                        {/* INFO BIEN & GUEST */}
                        <div className="flex-1 w-full text-center md:text-left">
                            <h3 className="text-white font-bold text-lg mb-1">{mov.listing.title}</h3>
                            <p className="text-slate-400 text-sm flex items-center justify-center md:justify-start gap-1 mb-3">
                                <MapPin size={12}/> {mov.listing.address}
                            </p>
                            
                            <div className="flex items-center justify-center md:justify-start gap-3 bg-black/20 p-2 rounded-lg w-fit mx-auto md:mx-0">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={mov.guest.image} />
                                    <AvatarFallback>{mov.guest.name?.substring(0,1)}</AvatarFallback>
                                </Avatar>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-white">{mov.guest.name}</p>
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Phone size={8}/> {mov.guest.phone || "Non renseigné"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ACTIONS CONNECTÉES */}
                        <div className="flex flex-col gap-2 min-w-[140px]">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Action requise</p>
                            <Button 
                                size="sm" 
                                className="w-full bg-white hover:bg-slate-200 text-black font-bold"
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
