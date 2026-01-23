"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Building2, UserCheck, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CreateAgencyModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // États du formulaire
  const [formData, setFormData] = useState({
    agencyName: "",
    agencySlug: "",
    adminName: "",
    adminEmail: "",
    adminPhone: ""
  });

  // Génération automatique du slug (ex: "Immo Prestige" -> "immo-prestige")
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData(prev => ({ ...prev, agencyName: name, agencySlug: slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ APPEL À VOTRE ROUTE API
      const res = await fetch("/api/superadmin/agencies", { // Assurez-vous que le fichier route.ts est dans ce dossier
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la création");
      }

      toast.success(`Agence "${data.credentials.email}" créée !`);
      toast.info(`Mot de passe temporaire : ${data.credentials.tempPassword}`, {
        duration: 10000, // Reste affiché 10 secondes
      });
      
      setOpen(false);
      setFormData({ agencyName: "", agencySlug: "", adminName: "", adminEmail: "", adminPhone: "" });
      router.refresh();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold gap-2">
          <Building2 size={18} /> Créer une Agence
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0f172a] border-slate-800 text-slate-200 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white flex items-center gap-2">
            <Building2 className="text-orange-500" /> Nouvelle Agence Partenaire
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          
          {/* SECTION AGENCE */}
          <div className="space-y-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Structure</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Nom de l'agence</Label>
                    <Input 
                        required 
                        placeholder="Ex: Orpi Abidjan" 
                        value={formData.agencyName}
                        onChange={handleNameChange}
                        className="bg-slate-950 border-slate-800 focus:border-orange-500"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Slug (URL)</Label>
                    <Input 
                        required 
                        placeholder="orpi-abidjan" 
                        value={formData.agencySlug}
                        onChange={(e) => setFormData({...formData, agencySlug: e.target.value})}
                        className="bg-slate-950 border-slate-800 focus:border-orange-500 font-mono text-xs"
                    />
                </div>
            </div>
          </div>

          {/* SECTION ADMIN */}
          <div className="space-y-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <UserCheck size={14} /> Administrateur Local
            </h3>
            
            <div className="space-y-2">
                <Label>Nom complet du directeur</Label>
                <Input 
                    required 
                    placeholder="Jean Kouassi" 
                    value={formData.adminName}
                    onChange={(e) => setFormData({...formData, adminName: e.target.value})}
                    className="bg-slate-950 border-slate-800 focus:border-orange-500"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Email pro</Label>
                    <Input 
                        required 
                        type="email"
                        placeholder="direction@orpi.ci" 
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                        className="bg-slate-950 border-slate-800 focus:border-orange-500"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input 
                        required 
                        placeholder="07 00 00 00 00" 
                        value={formData.adminPhone}
                        onChange={(e) => setFormData({...formData, adminPhone: e.target.value})}
                        className="bg-slate-950 border-slate-800 focus:border-orange-500"
                    />
                </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex items-start gap-3 text-xs text-blue-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Un mot de passe temporaire sera généré automatiquement et affiché à l'écran après la création.</p>
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-white text-black font-bold hover:bg-slate-200 h-12 text-lg"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Créer l'agence & l'admin"}
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  );
}
