"use client";

import { useState, useEffect } from "react";
import { X, LockKeyhole, Phone, User, KeyRound, Loader2, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ClaimPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  viewsCount?: number; // Pour le FOMO dynamique
}

export default function ClaimPropertyModal({ isOpen, onClose, propertyId, viewsCount = 14 }: ClaimPropertyModalProps) {
  const [formData, setFormData] = useState({ name: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  // Verrouiller le scroll de la page quand la modale est ouverte
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.password) {
        return toast.error("Veuillez remplir tous les champs.");
    }
    
    setLoading(true);

    try {
        // Remplacement de api.post par fetch natif (aucun import requis)
        const res = await fetch('/api/public/claim-property', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, propertyId })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            toast.success("Annonce récupérée ! Connectez-vous avec votre numéro.");
            onClose();
            // Optionnel: rediriger vers la page de connexion
            // window.location.href = '/login';
        } else {
            toast.error(data.error || "Erreur côté serveur.");
        }
    } catch (error) {
        toast.error("Impossible de joindre le serveur.");
        console.error("Erreur réseau:", error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-md bg-slate-900 border border-orange-500/30 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.1)] overflow-hidden">
        
        {/* Glow effect background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-[60px] pointer-events-none"></div>

        {/* Header Modale */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 relative z-10">
            <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <LockKeyhole className="text-orange-500 w-5 h-5" />
                Récupérer l'annonce
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition bg-slate-800/50 hover:bg-slate-800 p-2 rounded-full">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Corps Modale */}
        <div className="p-6 relative z-10">
            
            {/* Bannière FOMO */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                <TrendingUp className="text-orange-500 w-5 h-5 mt-0.5 shrink-0" />
                <div>
                    <p className="text-orange-500 text-sm font-bold">Cette annonce a été vue {viewsCount} fois aujourd'hui.</p>
                    <p className="text-slate-300 text-xs mt-1">Créez votre accès gratuit en 10s pour débloquer les numéros des locataires intéressés.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Champ Pseudo */}
                <div className="relative">
                    <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                    <input 
                        type="text" placeholder="Votre Nom ou Pseudo" required
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pl-11 text-sm text-white outline-none focus:border-orange-500 transition placeholder:text-slate-600"
                    />
                </div>

                {/* Champ WhatsApp (Crucial) */}
                <div className="relative">
                    <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                    <input 
                        type="tel" placeholder="Numéro WhatsApp (ex: 0700000000)" required
                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pl-11 text-sm text-white outline-none focus:border-orange-500 transition placeholder:text-slate-600"
                    />
                </div>

                {/* Champ Mot de passe */}
                <div className="relative">
                    <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                    <input 
                        type="password" placeholder="Mot de passe (pour votre futur accès)" required
                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pl-11 text-sm text-white outline-none focus:border-orange-500 transition placeholder:text-slate-600"
                    />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <p>Vos accès seront créés instantanément avec le rôle <strong className="text-slate-300">Ambassadeur</strong>.</p>
                </div>

                <button 
                    type="submit" disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-400 text-[#020617] font-black px-6 py-4 rounded-xl transition uppercase tracking-wider mt-6 disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg hover:shadow-orange-500/20 active:scale-[0.98]"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Accéder aux locataires"}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
}
