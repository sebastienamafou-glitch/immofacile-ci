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
import ImageUpload from "@/components/shared/ImageUpload";

interface AgencySettingsFormProps {
  initialData: Agency;
}

export default function AgencySettingsForm({ initialData }: AgencySettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Gestion Logo (Tableau de strings pour compatibilité ImageUpload, on prend le 1er)
  const [logo, setLogo] = useState<string[]>(initialData.logoUrl ? [initialData.logoUrl] : []);

  const [formData, setFormData] = useState({
    name: initialData.name,
    email: initialData.email || "",
    phone: initialData.phone || "",
    taxId: initialData.taxId || "",
    primaryColor: initialData.primaryColor || "#FF7900", // Orange par défaut
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/agency/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...formData,
            logoUrl: logo[0] || null // On envoie juste l'URL string
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Paramètres mis à jour avec succès !");
      router.refresh();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* 1. IDENTITÉ VISUELLE */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-blue-500" /> Marque & Branding
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label className="text-slate-400 mb-2 block">Logo de l'agence</Label>
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
                    <Label className="text-white">Nom commercial</Label>
                    <Input 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange}
                        className="bg-slate-950 border-slate-700 text-white" 
                        required 
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-white">Couleur principale (Hex)</Label>
                    <div className="flex gap-2">
                        <Input 
                            name="primaryColor" 
                            value={formData.primaryColor} 
                            onChange={handleChange}
                            className="bg-slate-950 border-slate-700 text-white" 
                        />
                        <div 
                            className="w-10 h-10 rounded border border-slate-700 shrink-0"
                            style={{ backgroundColor: formData.primaryColor }}
                        />
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* 2. CONTACTS & LÉGAL */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
                <Contact className="w-5 h-5 text-emerald-500" /> Coordonnées Publiques
            </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label className="text-white">Email de contact</Label>
                <Input 
                    name="email" 
                    type="email"
                    value={formData.email} 
                    onChange={handleChange}
                    className="bg-slate-950 border-slate-700 text-white" 
                />
            </div>
            <div className="space-y-2">
                <Label className="text-white">Téléphone (Standard)</Label>
                <Input 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange}
                    className="bg-slate-950 border-slate-700 text-white" 
                />
            </div>
            <div className="space-y-2 md:col-span-2">
                <Label className="text-white">N° Compte Contribuable (Tax ID)</Label>
                <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input 
                        name="taxId" 
                        value={formData.taxId} 
                        onChange={handleChange}
                        className="pl-10 bg-slate-950 border-slate-700 text-white" 
                    />
                </div>
                <p className="text-xs text-slate-500 mt-1">Nécessaire pour la facturation certifiée.</p>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading} size="lg" className="bg-orange-600 hover:bg-orange-500 text-white font-bold">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <><Save className="mr-2 w-4 h-4" /> Enregistrer les modifications</>}
        </Button>
      </div>
    </form>
  );
}
