"use client";

import { useState } from "react";
import Image from "next/image";
import { 
  Search, ShieldCheck, MessageCircle, HelpCircle, 
  ChevronDown, ChevronUp, Wallet, ArrowRight, Mail, Loader2, FileText, Zap
} from "lucide-react";
import { toast } from "sonner"; // ✅ On passe sur Sonner pour le côté Premium
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  
  // États pour le formulaire
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [sending, setSending] = useState(false);

  // --- LOGIQUE D'ENVOI DE TICKET ---
  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if(!ticketSubject || !ticketMessage) {
        toast.warning("Veuillez remplir le sujet et le message.");
        return;
    }

    setSending(true);

    // Simulation d'envoi API
    setTimeout(() => {
        setSending(false);
        toast.success("Ticket envoyé au support !", {
            description: "Référence : #TKT-2026. Nous vous répondrons sous 24h."
        });
        // Reset
        setTicketSubject("");
        setTicketMessage("");
    }, 1500);
  };

  const faqs = [
    { 
        category: "Finances",
        icon: Wallet,
        q: "Comment recharger mon compte ?", 
        a: "Allez dans 'Mes Finances', cliquez sur 'Recharger' et choisissez Wave ou Orange Money. Le solde est mis à jour instantanément." 
    },
    { 
        category: "Juridique",
        icon: FileText,
        q: "Valeur de la signature électronique ?", 
        a: "Conformément à la Loi n° 2013-546, la signature via OTP (Code SMS) a la même valeur juridique qu'une signature manuscrite certifiée." 
    },
    { 
        category: "Sécurité",
        icon: ShieldCheck,
        q: "Protection des cautions (Loi 2019)", 
        a: "Notre système 'Safety Check' bloque automatiquement toute demande de caution supérieure à 2 mois de loyer pour respecter la réglementation ivoirienne." 
    },
    { 
        category: "Technique",
        icon: Zap,
        q: "J'ai oublié mon mot de passe", 
        a: "Sur la page de connexion, cliquez sur 'Mot de passe oublié'. Un lien sécurisé vous sera envoyé par email pour le réinitialiser." 
    }
  ];

  const filteredFaqs = faqs.filter(f => 
    f.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans pb-20 selection:bg-orange-500/30">
        
        {/* --- HEADER HERO --- */}
        <div className="relative pt-16 pb-20 px-6 text-center overflow-hidden border-b border-white/5 bg-[#0B1120]">
            {/* Effets de fond */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute top-20 right-20 w-32 h-32 bg-orange-500/10 rounded-full blur-[60px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-6 backdrop-blur-md shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    Support Actif 24/7
                </div>

                <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
                    Centre d'Aide <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">ImmoFacile</span>
                </h1>
                
                <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                    Une question sur vos loyers, vos contrats ou la législation ? <br/>
                    Nous avons probablement déjà la réponse.
                </p>
                
                {/* Barre de Recherche Premium */}
                <div className="w-full max-w-xl relative group">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl group-hover:bg-blue-500/30 transition duration-500 opacity-0 group-hover:opacity-100"></div>
                    <div className="relative flex items-center bg-[#131b2e] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all h-16">
                        <div className="pl-6 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                            <Search className="w-6 h-6" />
                        </div>
                        <input 
                            type="text"
                            placeholder="Rechercher (ex: caution, retrait...)" 
                            className="w-full bg-transparent text-white px-4 py-4 outline-none placeholder:text-slate-600 font-medium text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>

        <main className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-10 -mt-8 relative z-20">
            
            {/* --- COLONNE GAUCHE : FAQ (8 cols) --- */}
            <div className="lg:col-span-8 space-y-6">
                
                {/* Cartes Catégories Rapides */}
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#131b2e]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/30 hover:bg-[#131b2e] transition duration-300 group cursor-default shadow-lg">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition duration-300 border border-emerald-500/20">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Trésorerie</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Retraits & Dépôts</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#131b2e]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 hover:border-blue-500/30 hover:bg-[#131b2e] transition duration-300 group cursor-default shadow-lg">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition duration-300 border border-blue-500/20">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Juridique</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Baux & Conformité</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Liste FAQ Accordéon */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4 px-2">
                        <HelpCircle className="text-orange-500 w-5 h-5" /> Questions Fréquentes
                    </h2>
                    
                    {filteredFaqs.length > 0 ? filteredFaqs.map((faq, i) => (
                        <div 
                            key={i} 
                            className={cn(
                                "group border rounded-2xl overflow-hidden transition-all duration-300",
                                openFaqIndex === i 
                                    ? "bg-[#131b2e] border-blue-500/30 shadow-lg shadow-blue-500/5" 
                                    : "bg-[#131b2e]/40 border-slate-800 hover:border-slate-700"
                            )}
                        >
                            <button onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                        openFaqIndex === i ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-500"
                                    )}>
                                        <faq.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 block">
                                            {faq.category}
                                        </span>
                                        <span className={cn("font-bold text-sm md:text-base transition-colors", openFaqIndex === i ? "text-white" : "text-slate-300")}>
                                            {faq.q}
                                        </span>
                                    </div>
                                </div>
                                {openFaqIndex === i ? <ChevronUp className="w-5 h-5 text-blue-500" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
                            </button>
                            
                            <div className={cn(
                                "grid transition-all duration-300 ease-in-out",
                                openFaqIndex === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            )}>
                                <div className="overflow-hidden">
                                    <div className="px-5 pb-6 pt-0 pl-[4.5rem] text-sm text-slate-400 leading-relaxed border-t border-dashed border-slate-800/50 mt-2 pt-4">
                                        {faq.a}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                            <p className="text-slate-500">Aucun résultat trouvé pour "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- COLONNE DROITE : CONTACT (4 cols) --- */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* Carte WhatsApp (Mise en avant) */}
                <div className="bg-gradient-to-br from-[#128C7E] to-[#075E54] p-6 rounded-3xl shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/20 transition duration-700"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-inner border border-white/10">
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <span className="bg-[#25D366] text-[#075E54] text-[10px] font-black px-2 py-1 rounded-md uppercase">En ligne</span>
                        </div>
                        
                        <h3 className="text-2xl font-black text-white mb-1">Support Live</h3>
                        <p className="text-green-100/80 text-sm font-medium mb-6">Réponse instantanée via WhatsApp.</p>
                        
                        <a 
                            href="https://wa.me/22507070707?text=Bonjour%20ImmoFacile" 
                            target="_blank" 
                            className="w-full bg-white text-[#075E54] font-bold py-3.5 rounded-xl hover:bg-green-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
                        >
                            Ouvrir le chat <ArrowRight className="w-4 h-4"/>
                        </a>
                    </div>
                </div>

                {/* Formulaire Email */}
                <div className="bg-[#131b2e] border border-slate-800 rounded-3xl p-6 shadow-2xl">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <Mail className="w-4 h-4 text-slate-400"/> Ticket Email
                    </h3>
                    
                    <form className="space-y-4" onSubmit={handleSendTicket}>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Sujet de la demande</label>
                            <Input 
                                value={ticketSubject}
                                onChange={(e) => setTicketSubject(e.target.value)}
                                placeholder="Ex: Problème technique..." 
                                className="bg-[#0B1120] border-slate-700 focus:border-blue-500 h-11"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Votre message</label>
                            <textarea 
                                value={ticketMessage}
                                onChange={(e) => setTicketMessage(e.target.value)}
                                className="flex min-h-[120px] w-full rounded-xl border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none" 
                                placeholder="Détaillez votre problème..." 
                            />
                        </div>
                        <Button 
                            type="submit"
                            disabled={sending}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 rounded-xl mt-2"
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                            {sending ? "Envoi en cours..." : "Envoyer le ticket"}
                        </Button>
                    </form>
                </div>

            </div>
        </main>
    </div>
  );
}
