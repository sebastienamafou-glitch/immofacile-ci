"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, DollarSign, BedDouble, Bath, Ruler, Save, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api"; // ✅ Wrapper Sécurisé
import ImageUpload from "@/components/dashboard/shared/ImageUpload"; // ✅ Composant d'upload réel

const PROPERTY_TYPES = ["APPARTEMENT", "VILLA", "STUDIO", "MAGASIN", "BUREAU", "TERRAIN"];

interface Owner {
    id: string;
    name: string | null;
    email: string | null;
}

export default function CreatePropertyForm({ owners }: { owners: Owner[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    commune: "",
    price: "",
    type: "APPARTEMENT",
    bedrooms: "1",
    bathrooms: "1",
    surface: "",
    ownerId: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ APPEL SÉCURISÉ
      const res = await api.post("/agency/properties/create", {
            ...formData,
            images: images
      });

      if (res.data.success) {
          toast.success("Mandat créé avec succès ! 🏠");
          router.push("/dashboard/agency/properties");
          router.refresh();
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Une erreur est survenue";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* SECTION 1 : INFORMATIONS GÉNÉRALES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Building2 className="text-orange-500" /> Détails du Bien
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Titre de l'annonce</label>
                <Input name="title" placeholder="Ex: Villa Duplex Haut Standing" required className="bg-slate-950 border-slate-800 text-white" value={formData.title} onChange={handleChange} />
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Type de bien</label>
                <Select onValueChange={(val) => handleSelectChange("type", val)} defaultValue={formData.type}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                        <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {PROPERTY_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Propriétaire (Bailleur)</label>
                <Select onValueChange={(val) => handleSelectChange("ownerId", val)} required>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                        <SelectValue placeholder="Sélectionner un propriétaire" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {owners.length === 0 ? (
                            <SelectItem value="none" disabled>Aucun propriétaire trouvé</SelectItem>
                        ) : (
                            owners.map(owner => (
                                <SelectItem key={owner.id} value={owner.id}>
                                    {owner.name || "Inconnu"} ({owner.email})
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>

            <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Description</label>
                <Textarea name="description" placeholder="Description détaillée..." className="bg-slate-950 border-slate-800 text-white min-h-[100px]" value={formData.description} onChange={handleChange} />
            </div>
        </div>
      </div>

      {/* SECTION 2 : LOCALISATION & PRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <MapPin className="text-blue-500" /> Localisation & Loyer
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Commune / Quartier</label>
                <Input name="commune" placeholder="Ex: Cocody, Riviera 2" required className="bg-slate-950 border-slate-800 text-white" value={formData.commune} onChange={handleChange} />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Adresse exacte</label>
                <Input name="address" placeholder="Rue I42, Porte 12..." required className="bg-slate-950 border-slate-800 text-white" value={formData.address} onChange={handleChange} />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Loyer Mensuel (FCFA)</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="price" type="number" placeholder="500000" required className="pl-9 bg-slate-950 border-slate-800 text-emerald-500 font-bold" value={formData.price} onChange={handleChange} />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Surface (m²)</label>
                <div className="relative">
                    <Ruler className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="surface" type="number" placeholder="150" className="pl-9 bg-slate-950 border-slate-800 text-white" value={formData.surface} onChange={handleChange} />
                </div>
            </div>
        </div>
      </div>

      {/* SECTION 3 : COMPOSITION & PHOTOS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <BedDouble className="text-purple-500" /> Composition & Photos
        </h3>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Chambres</label>
                <div className="relative">
                    <BedDouble className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="bedrooms" type="number" min="0" required className="pl-9 bg-slate-950 border-slate-800 text-white" value={formData.bedrooms} onChange={handleChange} />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Salles d'eau</label>
                <div className="relative">
                    <Bath className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="bathrooms" type="number" min="0" required className="pl-9 bg-slate-950 border-slate-800 text-white" value={formData.bathrooms} onChange={handleChange} />
                </div>
            </div>
        </div>

        <div className="col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Galerie Photos</label>
            <ImageUpload 
                value={images} 
                onChange={(urls) => setImages(urls)}
                onRemove={(url) => setImages(images.filter(i => i !== url))}
            />
        </div>
      </div>

      <div className="flex justify-end gap-4 pb-10">
        <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
            Annuler
        </Button>
        <Button 
            type="submit" 
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-transform"
        >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <><Save className="mr-2 w-4 h-4" /> Enregistrer le Mandat</>}
        </Button>
      </div>

    </form>
  );
}
