"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Agency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Building, Palette, Contact } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api"; // ✅ Wrapper Sécurisé
import ImageUpload from "@/components/dashboard/shared/ImageUpload"; // ✅ Chemin standardisé

interface AgencySettingsFormProps {
  initialData: Agency;
}

export default function AgencySettingsForm({ initialData }: AgencySettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Gestion Logo (Tableau pour compatibilité ImageUpload)
  const [logo, setLogo] = useState<string[]>(initialData.logoUrl ? [initialData.logoUrl] : []);

  const [formData, setFormData] = useState({
    name: initialData.name,
    email: initialData.email || "",
    phone: initialData.phone || "",
    taxId: initialData.taxId || "",
    primaryColor: initialData.primaryColor || "#FF7900",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ PATCH via Axios Wrapper
      const res = await api.patch("/agency/settings", {
            ...formData,
            logoUrl: logo[0] || null // On envoie l'URL string au backend
      });

      if (res.data.success) {
          toast.success("Agence mise à jour avec succès ! 🚀");
          router.refresh();
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Erreur lors de la mise à jour.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. IDENTITÉ VISUELLE */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Palette className="w-5 h-5 text-blue-500" /> Marque & Branding
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label className="text-slate-400 mb-2 block font-bold text-xs uppercase">Logo de l'agence</Label>
                <div className="max-w-xs">
                    <ImageUpload 
                        value={logo} 
                        onChange={(urls) => setLogo(urls)}
                        onRemove={() => setLogo([])}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-slate-400 font-bold text-xs uppercase">Nom commercial</Label>
                    <Input 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange}
                        className="bg-slate-950 border-slate-700 text-white h-12 focus:border-blue-500" 
                        required 
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-400 font-bold text-xs uppercase">Couleur principale (Hex)</Label>
                    <div className="flex gap-2">
                        <Input 
                            name="primaryColor" 
                            value={formData.primaryColor} 
                            onChange={handleChange}
                            className="bg-slate-950 border-slate-700 text-white h-12 focus:border-blue-500 font-mono" 
                        />
                        <div 
                            className="w-12 h-12 rounded-lg border border-slate-700 shrink-0 shadow-lg"
                            style={{ backgroundColor: formData.primaryColor }}
                        />
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* 2. CONTACTS & LÉGAL */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Contact className="w-5 h-5 text-emerald-500" /> Coordonnées Publiques
            </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label className="text-slate-400 font-bold text-xs uppercase">Email de contact</Label>
                <Input 
                    name="email" 
                    type="email"
                    value={formData.email} 
                    onChange={handleChange}
                    className="bg-slate-950 border-slate-700 text-white h-12 focus:border-emerald-500" 
                />
            </div>
            <div className="space-y-2">
                <Label className="text-slate-400 font-bold text-xs uppercase">Téléphone (Standard)</Label>
                <Input 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange}
                    className="bg-slate-950 border-slate-700 text-white h-12 focus:border-emerald-500" 
                />
            </div>
            <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-400 font-bold text-xs uppercase">N° Compte Contribuable (Tax ID)</Label>
                <div className="relative">
                    <Building className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                    <Input 
                        name="taxId" 
                        value={formData.taxId} 
                        onChange={handleChange}
                        className="pl-10 bg-slate-950 border-slate-700 text-white h-12 focus:border-emerald-500 font-mono" 
                    />
                </div>
                <p className="text-xs text-slate-500 mt-1">Nécessaire pour l'émission de factures certifiées.</p>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 pb-20">
        <Button type="submit" disabled={loading} size="lg" className="bg-orange-600 hover:bg-orange-500 text-white font-bold h-14 px-8 rounded-xl shadow-lg shadow-orange-900/20 active:scale-95 transition-transform">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <><Save className="mr-2 w-5 h-5" /> Enregistrer les modifications</>}
        </Button>
      </div>
    </form>
  );
}
