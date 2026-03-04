"use client";

import { useState, useEffect } from "react";
import { X, User, Phone, Loader2, Home } from "lucide-react";
import { toast } from "sonner";

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
}

export default function LeadCaptureModal({ isOpen, onClose, propertyId, propertyTitle }: LeadCaptureModalProps) {
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return toast.error("Veuillez remplir tous les champs.");
    
    setLoading(true);

    try {
        const res = await fetch('/api/public/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, propertyId, propertyTitle })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            toast.success("Demande envoyée ! Le gestionnaire vous contactera sur WhatsApp.");
            onClose();
        } else {
            toast.error(data.error || "Une erreur est survenue.");
        }
    } catch (error) {
        toast.error("Impossible d'envoyer la demande.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Home className="text-orange-500 w-5 h-5" />
                Visiter ce bien
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition bg-white hover:bg-slate-200 p-2 rounded-full shadow-sm">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="p-6">
            <p className="text-sm text-slate-500 font-medium mb-6">
                Laissez vos coordonnées pour être recontacté rapidement par le gestionnaire de <strong className="text-slate-800">{propertyTitle}</strong>.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" placeholder="Prénom et Nom" required
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-11 text-sm text-slate-900 outline-none focus:border-orange-500 transition"
                    />
                </div>
                <div className="relative">
                    <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                        type="tel" placeholder="Numéro WhatsApp" required
                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-11 text-sm text-slate-900 outline-none focus:border-orange-500 transition"
                    />
                </div>
                <button 
                    type="submit" disabled={loading}
                    className="w-full bg-[#0B1120] hover:bg-orange-600 text-white font-bold px-6 py-4 rounded-xl transition mt-2 disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Être recontacté"}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
}
