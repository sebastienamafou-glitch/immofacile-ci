"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Mail, Phone, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api"; // ✅ Wrapper Sécurisé
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function CreateAgentModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    jobTitle: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ APPEL SÉCURISÉ
      const res = await api.post("/agency/team/create", formData);

      if (res.data.success) {
          toast.success("Agent ajouté avec succès !");
          setFormData({ name: "", email: "", phone: "", jobTitle: "" }); 
          setOpen(false);
          router.refresh();
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Erreur lors de la création";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-500 text-white gap-2 font-bold shadow-lg shadow-orange-900/10">
            <UserPlus size={18} /> Ajouter un membre
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-950 border-slate-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <UserPlus className="text-orange-500" /> Nouvel Agent
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Nom complet</label>
                <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="name" placeholder="Ex: Jean Kouassi" required className="pl-9 bg-slate-900 border-slate-800" value={formData.name} onChange={handleChange} />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Email professionnel</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="email" type="email" placeholder="jean@immofacile.ci" required className="pl-9 bg-slate-900 border-slate-800" value={formData.email} onChange={handleChange} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Input name="phone" placeholder="0707..." required className="pl-9 bg-slate-900 border-slate-800" value={formData.phone} onChange={handleChange} />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Poste</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Input name="jobTitle" placeholder="Agent Senior" className="pl-9 bg-slate-900 border-slate-800" value={formData.jobTitle} onChange={handleChange} />
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold h-10">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : "Créer le compte"}
                </Button>
                <p className="text-[10px] text-slate-500 text-center mt-3">
                    Un mot de passe par défaut sera généré et envoyé (simulé).
                </p>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
