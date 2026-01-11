"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation"; 
import { api } from "@/lib/api"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Home, MapPin, Banknote, Upload, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link"; 
import { toast } from "sonner"; // J'ajoute toast pour un meilleur feedback

export default function AddPropertyPage() {
  const router = useRouter(); 
  const [loading, setLoading] = useState(false);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    address: "",
    commune: "Cocody",
    price: "",
    type: "APPARTEMENT",
    bedrooms: "",
    surface: "",
    description: ""
  });

  // --- GESTION DES IMAGES ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
        URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
    });
  };

  const handleChange = (e: any) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (val: string, field: string) => {
      setFormData(prev => ({ ...prev, [field]: val }));
  };

  // --- SOUMISSION DU FORMULAIRE (CORRIGÉE) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. SÉCURITÉ : On récupère l'identité
    const stored = localStorage.getItem("immouser");
    if (!stored) {
        toast.error("Votre session a expiré. Veuillez vous reconnecter.");
        router.push('/login');
        return;
    }
    const user = JSON.parse(stored);

    setLoading(true);

    try {
      const formDataToSend = new FormData();

      formDataToSend.append('title', formData.title);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('commune', formData.commune);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('bedrooms', formData.bedrooms);
      formDataToSend.append('surface', formData.surface);
      formDataToSend.append('description', formData.description);

      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file) => {
            formDataToSend.append('images', file);
        });
      }

      // 2. APPEL API SÉCURISÉ (Avec le Header !)
      const res = await api.post('/owner/properties', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data', // Important pour l'upload
            'x-user-email': user.email             // ✅ LA CLÉ MANQUANTE
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
    <div className="max-w-4xl mx-auto pb-20">
      
      <div className="mb-6">
        <Link 
            href="/dashboard/owner"
            className="text-slate-400 hover:text-white flex items-center gap-2 mb-4 text-sm cursor-pointer transition-colors inline-flex"
        >
            <ArrowLeft className="w-4 h-4" /> Retour au Dashboard
        </Link>

        <h1 className="text-3xl font-black text-white">Ajouter un Bien</h1>
        <p className="text-slate-400">Remplissez les informations pour publier une nouvelle propriété.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLONNE GAUCHE (Formulaire) */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Home className="w-5 h-5 text-blue-500" /> Informations Générales
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-white">Nom du bien</Label>
                                <Input id="title" placeholder="Ex: Villa Duplex Cocody" className="bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]" value={formData.title} onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white">Commune</Label>
                                <Select onValueChange={(val) => handleSelectChange(val, 'commune')} defaultValue={formData.commune}>
                                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]">
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cocody">Cocody</SelectItem>
                                        <SelectItem value="Yopougon">Yopougon</SelectItem>
                                        <SelectItem value="Marcory">Marcory</SelectItem>
                                        <SelectItem value="Plateau">Plateau</SelectItem>
                                        <SelectItem value="Bingerville">Bingerville</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price" className="text-white">Loyer (FCFA)</Label>
                                <div className="relative">
                                    <Banknote className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input id="price" type="number" placeholder="150000" className="pl-10 bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]" value={formData.price} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="surface" className="text-white">Surface (m²)</Label>
                                <Input id="surface" type="number" placeholder="75" className="bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]" value={formData.surface} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bedrooms" className="text-white">Chambres</Label>
                                <Input id="bedrooms" type="number" placeholder="2" className="bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]" value={formData.bedrooms} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-white">Adresse complète</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input id="address" placeholder="Rue I42, Angré 8ème tranche..." className="pl-10 bg-slate-950 border-slate-700 text-white focus:border-[#F59E0B]" value={formData.address} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-white">Description</Label>
                            <Textarea id="description" placeholder="Atouts, commodités..." className="bg-slate-950 border-slate-700 text-white h-32 focus:border-[#F59E0B]" value={formData.description} onChange={handleChange} />
                        </div>

                    </CardContent>
                </Card>
            </div>

            {/* COLONNE DROITE (Photos) */}
            <div className="space-y-6">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center justify-between">
                            <span className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-[#F59E0B]" /> Photos</span>
                            <span className="text-xs text-slate-500">{selectedFiles.length} photo(s)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div 
                            className="border-2 border-dashed border-slate-700 bg-slate-950/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#F59E0B] hover:bg-slate-900 transition group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition group-hover:bg-[#F59E0B]/20">
                                <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#F59E0B]" />
                            </div>
                            <p className="text-sm font-bold text-slate-300 group-hover:text-white">Cliquez pour ajouter</p>
                            <p className="text-xs text-slate-500 mt-1">JPG, PNG (Max 5Mo)</p>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                multiple 
                                accept="image/*" 
                                onChange={handleImageChange} 
                            />
                        </div>

                        {previews.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {previews.map((src, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 group">
                                        <img src={src} alt="Aperçu" className="w-full h-full object-cover" />
                                        <button 
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md transform hover:scale-110 transition opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Button type="submit" className="w-full bg-[#F59E0B] hover:bg-yellow-500 text-black font-bold h-12 text-lg shadow-lg shadow-orange-500/20" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Publier l'annonce"}
                </Button>
            </div>
        </div>
      </form>
    </div>
  );
}
