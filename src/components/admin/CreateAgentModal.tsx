"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, UserPlus, X, Eye, EyeOff, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Pour rafraîchir la liste après création
}

export default function CreateAgentModal({ isOpen, onClose, onSuccess }: CreateAgentModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "" // L'admin définit le mot de passe initial
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Appel à la route que nous avons créée dans adminRoutes.js
      await api.post('/admin/agents', formData);

      toast.success("Agent créé avec succès !");
      toast.info(`Mot de passe à transmettre : ${formData.password}`);
      
      onSuccess(); // Rafraîchit la liste
      onClose();   // Ferme la modale
      
      // Reset du formulaire
      setFormData({ name: "", email: "", phone: "", password: "" });

    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  // Petit outil pour générer un mot de passe fort automatiquement
  const generatePassword = () => {
    const pass = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase();
    setFormData({ ...formData, password: pass });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950/50 px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-white">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Nouvel Agent
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="space-y-1">
            <Label>Nom complet</Label>
            <Input 
              required
              placeholder="Ex: Sophie Martin"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input 
                required
                type="email"
                placeholder="agent@immo.ci"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input 
                required
                placeholder="07 00 00 00 00"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
                <Label>Mot de passe provisoire</Label>
                <button type="button" onClick={generatePassword} className="text-xs text-blue-500 font-medium hover:underline">
                    Générer auto
                </button>
            </div>
            <div className="relative">
                <Input 
                  required
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              ⚠️ Notez ce mot de passe pour le transmettre à l'agent.
            </p>
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="w-full" onClick={onClose}>
                Annuler
            </Button>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Créer l'Agent"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
