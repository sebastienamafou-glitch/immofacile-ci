"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { 
  ArrowLeft, FileText, CheckCircle, XCircle, Loader2, Hammer, 
  MessageCircle, ShieldCheck, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
// ✅ On réutilise le composant Chat pour que le proprio discute avec l'artisan
import IncidentChat from "@/components/shared/IncidentChat"; 

export default function OwnerIncidentDetail() {
  const { id } = useParams();
  const router = useRouter();
  
  const [incident, setIncident] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. CHARGEMENT DES DONNÉES
  const fetchData = async () => {
    try {
      // Récupérer l'incident avec le devis et l'artisan
      const res = await api.get(`/owner/incidents/${id}`);
      if (res.data.success) {
          setIncident(res.data.incident);
      }
      
      // Récupérer l'user courant pour le chat
      const userRes = await api.get('/auth/session');
      if (userRes.data?.user) setCurrentUser(userRes.data.user);

    } catch (e) { 
      console.error(e);
      router.push('/dashboard/owner/incidents'); // Décommenter en prod
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { if(id) fetchData(); }, [id]);

  // 2. ACTION : VALIDER OU REFUSER LE DEVIS
  const handleQuoteResponse = async (quoteId: string, action: 'ACCEPT' | 'REJECT') => {
      try {
          await api.post('/owner/quotes/respond', { quoteId, action });
          
          if (action === 'ACCEPT') {
            toast.success("Devis validé ! L'artisan a été notifié.");
            // Confettis ou animation possible ici
          } else {
            toast.info("Devis refusé.");
          }
          
          fetchData(); // Rafraîchir pour voir le changement de statut
      } catch (e) {
          toast.error("Erreur lors de la transmission de la réponse.");
      }
  };

  if (loading) return <div className="h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div>;
  if (!incident) return null;

  // On récupère le devis actif (le dernier non rejeté)
  const activeQuote = incident.quotes && incident.quotes.length > 0 ? incident.quotes[0] : null;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 md:p-10 font-sans pb-20">
        
        {/* HEADER */}
        <div className="max-w-6xl mx-auto mb-8">
            <Button onClick={() => router.back()} variant="ghost" className="mb-6 pl-0 hover:bg-transparent text-slate-500 hover:text-white transition-colors group text-xs font-black uppercase tracking-widest">
                <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform"/> Retour
            </Button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                         <Badge className={`${incident.status === 'RESOLVED' ? 'bg-emerald-500' : incident.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-orange-500'} text-white border-none px-3 py-1 text-[10px] tracking-widest uppercase font-black`}>
                             {incident.status}
                         </Badge>
                         <span className="text-xs text-slate-500 font-mono">#{incident.id.slice(0,8)}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter">{incident.title}</h1>
                </div>
                
                {/* Info Artisan */}
                {incident.assignedTo && (
                    <div className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                        <div className="bg-blue-500/10 p-2 rounded-full">
                            <Hammer className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Artisan en charge</span>
                            <span className="text-sm font-bold text-white">{incident.assignedTo.name}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* --- COLONNE GAUCHE : CONTEXTE & CHAT --- */}
            <div className="space-y-8">
                
                {/* Description Incident */}
                <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Rapport du Locataire
                    </h3>
                    <p className="text-slate-300 text-lg leading-relaxed font-medium italic">
                        "{incident.description}"
                    </p>
                    {incident.photos?.length > 0 && (
                        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
                            {incident.photos.map((url: string, i: number) => (
                                <img key={i} src={url} className="h-20 w-20 object-cover rounded-lg border border-white/10" alt="Preuve"/>
                            ))}
                        </div>
                    )}
                </div>

                {/* ZONE DE TCHAT (Négociation) */}
                {incident.assignedTo && (
                    <div className="bg-[#0F172A] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[500px]">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-emerald-500"/>
                            <span className="text-xs font-bold uppercase tracking-wider text-white">Discussion avec l'artisan</span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <IncidentChat incidentId={incident.id} currentUserId={currentUser?.id} />
                        </div>
                    </div>
                )}
            </div>

            {/* --- COLONNE DROITE : LE DEVIS (Action Requise) --- */}
            <div className="space-y-6">
                
                {activeQuote ? (
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-4 duration-500">
                        
                        {/* Status Header */}
                        <div className={`p-6 border-b border-white/5 flex justify-between items-start ${activeQuote.status === 'ACCEPTED' ? 'bg-emerald-900/20' : 'bg-orange-900/10'}`}>
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                                    <FileText className={activeQuote.status === 'ACCEPTED' ? 'text-emerald-500' : 'text-orange-500'}/> 
                                    Devis #{activeQuote.number?.split('-')[1] || 'PROVISOIRE'}
                                </h2>
                                <p className="text-slate-400 text-xs mt-1 uppercase tracking-wide">Date: {new Date(activeQuote.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Badge className={`${activeQuote.status === 'ACCEPTED' ? 'bg-emerald-500' : 'bg-orange-500'} text-black font-bold border-none`}>
                                {activeQuote.status === 'ACCEPTED' ? 'VALIDÉ' : 'EN ATTENTE'}
                            </Badge>
                        </div>

                        {/* Liste des prestations */}
                        <div className="p-6 space-y-4 bg-[#0F172A]">
                            {activeQuote.items.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                                    <div>
                                        <span className="font-bold text-slate-200 block">{item.description}</span>
                                        <div className="text-xs text-slate-500">Qte: {item.quantity} x {formatCurrency(item.unitPrice)}</div>
                                    </div>
                                    <span className="font-mono font-bold text-white">{formatCurrency(item.total)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="bg-black/30 p-6 flex justify-between items-center border-t border-slate-800">
                            <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Total à payer</span>
                            <span className="text-3xl font-black text-white">{formatCurrency(activeQuote.totalAmount)} <span className="text-orange-500 text-lg">FCFA</span></span>
                        </div>

                        {/* ACTIONS (Uniquement si PENDING) */}
                        {activeQuote.status === 'PENDING' && (
                            <div className="p-6 grid grid-cols-2 gap-4 bg-[#0F172A] border-t border-slate-800">
                                <Button 
                                    onClick={() => handleQuoteResponse(activeQuote.id, 'REJECT')} 
                                    variant="outline" 
                                    className="border-red-500/30 text-red-500 hover:bg-red-500/10 h-14 uppercase font-bold text-xs tracking-widest"
                                >
                                    <XCircle className="mr-2 h-5 w-5"/> Refuser
                                </Button>
                                <Button 
                                    onClick={() => handleQuoteResponse(activeQuote.id, 'ACCEPT')} 
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white h-14 uppercase font-bold text-xs tracking-widest shadow-lg shadow-emerald-900/20"
                                >
                                    <CheckCircle className="mr-2 h-5 w-5"/> Valider & Lancer
                                </Button>
                            </div>
                        )}
                        
                        {/* Message si validé */}
                        {activeQuote.status === 'ACCEPTED' && (
                            <div className="p-4 bg-emerald-500/10 text-emerald-400 text-center font-bold text-xs uppercase tracking-widest border-t border-emerald-500/20">
                                <CheckCircle className="w-4 h-4 inline-block mr-2"/>
                                Travaux autorisés le {new Date(activeQuote.updatedAt).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                ) : (
                    // État vide (Pas encore de devis)
                    <div className="border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center h-full min-h-[300px]">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                            <Hammer className="w-8 h-8 opacity-50"/>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">En attente de devis</h3>
                        <p className="text-sm max-w-xs mx-auto mb-6">L'artisan étudie actuellement le problème. Vous recevrez une notification dès qu'il aura chiffré l'intervention.</p>
                        <div className="flex items-center gap-2 text-xs font-mono text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin"/>
                            Traitement en cours...
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
