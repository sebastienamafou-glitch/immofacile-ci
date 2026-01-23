"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Home, MapPin, Banknote, ImageIcon, Bed, Bath, Ruler } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ImageUpload from "@/components/shared/ImageUpload"; // ✅ Le composant magique

export default function AddPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // ✅ On stocke les URLs Cloudinary ici (et non plus des fichiers bruts)
  const [images, setImages] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    address: "",
    commune: "Cocody",
    price: "",
    type: "APPARTEMENT", // Valeur par défaut conforme à l'Enum
    bedrooms: "1",
    bathrooms: "1",
    surface: "",
    description: ""
  });

  const handleChange = (e: any) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (val: string, field: string) => {
      setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (images.length === 0) {
        toast.error("Veuillez ajouter au moins une photo.");
        return;
    }

    const stored = localStorage.getItem("immouser");
    if (!stored) {
        toast.error("Session expirée.");
        router.push('/login');
        return;
    }
    const user = JSON.parse(stored);

    setLoading(true);

    try {
      // ✅ Préparation du payload JSON propre (Typage conforme Schema)
      const payload = {
          ...formData,
          price: parseInt(formData.price),
          bedrooms: parseInt(formData.bedrooms),
          bathrooms: parseInt(formData.bathrooms),
          surface: formData.surface ? parseFloat(formData.surface) : null,
          images: images // Tableau d'URLs
      };

      const res = await api.post('/owner/properties', payload, {
          headers: {
            'Content-Type': 'application/json', // JSON standard
            'x-user-email': user.email
          }
      });
      
      if (res.data.success) {
        toast.success("Bien publié avec succès !");
        router.refresh();
        router.push('/dashboard/owner');
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Erreur lors de la publication.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 md:px-0">
      
      <div className="mb-8">
        <Link 
            href="/dashboard/owner"
            className="text-slate-400 hover:text-white flex items-center gap-2 mb-4 text-sm cursor-pointer transition-colors inline-flex"
        >
            <ArrowLeft className="w-4 h-4" /> Retour au Dashboard
        </Link>

        <h1 className="text-3xl font-black text-white">Ajouter un Bien</h1>
        <p className="text-slate-400">Publiez une nouvelle propriété sur le marché.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE : INFOS */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Home className="w-5 h-5 text-blue-500" /> Informations Générales
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-white font-semibold">Titre de l'annonce</Label>
                                <Input id="title" placeholder="Ex: Villa Duplex Standing" className="bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]" value={formData.title} onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white font-semibold">Type de bien</Label>
                                <Select onValueChange={(val) => handleSelectChange(val, 'type')} defaultValue={formData.type}>
                                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]">
                                        <SelectValue placeholder="Choisir..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 text-white border-slate-800">
                                        <SelectItem value="APPARTEMENT">Appartement</SelectItem>
                                        <SelectItem value="VILLA">Villa</SelectItem>
                                        <SelectItem value="STUDIO">Studio</SelectItem>
                                        <SelectItem value="MAGASIN">Magasin</SelectItem>
                                        <SelectItem value="BUREAU">Bureau</SelectItem>
                                        <SelectItem value="TERRAIN">Terrain</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="price" className="text-white font-semibold">Loyer (FCFA)</Label>
                                <div className="relative">
                                    <Banknote className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input id="price" type="number" placeholder="250000" className="pl-10 bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]" value={formData.price} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="commune" className="text-white font-semibold">Commune</Label>
                                <Select onValueChange={(val) => handleSelectChange(val, 'commune')} defaultValue={formData.commune}>
                                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]">
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 text-white border-slate-800">
                                        <SelectItem value="Cocody">Cocody</SelectItem>
                                        <SelectItem value="Yopougon">Yopougon</SelectItem>
                                        <SelectItem value="Marcory">Marcory</SelectItem>
                                        <SelectItem value="Plateau">Plateau</SelectItem>
                                        <SelectItem value="Bingerville">Bingerville</SelectItem>
                                        <SelectItem value="Koumassi">Koumassi</SelectItem>
                                        <SelectItem value="Port-Bouet">Port-Bouët</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="surface" className="text-white font-semibold">Surface (m²)</Label>
                                <div className="relative">
                                    <Ruler className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input id="surface" type="number" className="pl-10 bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]" value={formData.surface} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="bedrooms" className="text-white font-semibold">Chambres</Label>
                                <div className="relative">
                                    <Bed className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input id="bedrooms" type="number" className="pl-10 bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]" value={formData.bedrooms} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bathrooms" className="text-white font-semibold">Salles de bain</Label>
                                <div className="relative">
                                    <Bath className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input id="bathrooms" type="number" className="pl-10 bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]" value={formData.bathrooms} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-white font-semibold">Adresse exacte</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input id="address" placeholder="Rue, Quartier, Repère..." className="pl-10 bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]" value={formData.address} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-white font-semibold">Description détaillée</Label>
                            <Textarea id="description" placeholder="Décrivez les atouts du bien..." className="bg-slate-950 border-slate-700 text-white h-32 focus:border-[#F59E0B]" value={formData.description} onChange={handleChange} />
                        </div>

                    </CardContent>
                </Card>
            </div>

            {/* COLONNE DROITE : PHOTOS & ACTIONS */}
            <div className="space-y-6">
                <Card className="bg-slate-900 border-slate-800 shadow-xl sticky top-6">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center justify-between">
                            <span className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-[#F59E0B]" /> Photos</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* ✅ LE GAIN DE PLACE EST ICI : LE COMPOSANT REUTILISABLE */}
                        <ImageUpload 
                            value={images} 
                            onChange={(urls) => setImages(urls)}
                            onRemove={(url) => setImages(images.filter((current) => current !== url))}
                        />
                    </CardContent>
                    
                    <div className="p-6 pt-0">
                        <Button type="submit" className="w-full bg-[#F59E0B] hover:bg-yellow-500 text-black font-bold h-12 text-lg shadow-lg shadow-orange-500/20" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Publier l'annonce"}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
      </form>
    </div>
  );
}
