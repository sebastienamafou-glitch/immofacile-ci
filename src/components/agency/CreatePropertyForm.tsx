"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, DollarSign, BedDouble, Bath, Ruler, Image as ImageIcon, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Liste des types définie dans le Schema Prisma
const PROPERTY_TYPES = ["APPARTEMENT", "VILLA", "STUDIO", "MAGASIN", "BUREAU", "TERRAIN"];

interface Owner {
    id: string;
    name: string | null;
    email: string | null;
}

export default function CreatePropertyForm({ owners }: { owners: Owner[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imagesInput, setImagesInput] = useState(""); // Simple input texte pour les URLs temporairement

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

    // Transformation des images (séparées par des virgules)
    const imagesArray = imagesInput.split(',').map(url => url.trim()).filter(url => url.length > 0);

    try {
      const res = await fetch("/api/agency/properties/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...formData,
            images: imagesArray.length > 0 ? imagesArray : ["https://placehold.co/600x400/png?text=Pas+d'image"]
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Mandat créé avec succès !");
      router.push("/dashboard/agency/properties");
      router.refresh();

    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      
      {/* SECTION 1 : INFORMATIONS GÉNÉRALES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Building2 className="text-orange-500" /> Détails du Bien
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Titre de l'annonce</label>
                <Input name="title" placeholder="Ex: Villa Duplex Haut Standing" required className="bg-slate-950 border-slate-800" value={formData.title} onChange={handleChange} />
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Type de bien</label>
                <Select onValueChange={(val) => handleSelectChange("type", val)} defaultValue={formData.type}>
                    <SelectTrigger className="bg-slate-950 border-slate-800">
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
                    <SelectTrigger className="bg-slate-950 border-slate-800">
                        <SelectValue placeholder="Sélectionner un propriétaire" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {owners.length === 0 ? (
                            <SelectItem value="none" disabled>Aucun propriétaire trouvé</SelectItem>
                        ) : (
                            owners.map(owner => (
                                <SelectItem key={owner.id} value={owner.id}>
                                    {owner.name} ({owner.email})
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>

            <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Description</label>
                <Textarea name="description" placeholder="Description détaillée..." className="bg-slate-950 border-slate-800 min-h-[100px]" value={formData.description} onChange={handleChange} />
            </div>
        </div>
      </div>

      {/* SECTION 2 : LOCALISATION & PRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <MapPin className="text-blue-500" /> Localisation & Loyer
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Commune / Quartier</label>
                <Input name="commune" placeholder="Ex: Cocody, Riviera 2" required className="bg-slate-950 border-slate-800" value={formData.commune} onChange={handleChange} />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Adresse exacte</label>
                <Input name="address" placeholder="Rue I42, Porte 12..." required className="bg-slate-950 border-slate-800" value={formData.address} onChange={handleChange} />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Loyer Mensuel (FCFA)</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="price" type="number" placeholder="500000" required className="pl-9 bg-slate-950 border-slate-800" value={formData.price} onChange={handleChange} />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Surface (m²)</label>
                <div className="relative">
                    <Ruler className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="surface" type="number" placeholder="150" className="pl-9 bg-slate-950 border-slate-800" value={formData.surface} onChange={handleChange} />
                </div>
            </div>
        </div>
      </div>

      {/* SECTION 3 : COMPOSITION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <BedDouble className="text-purple-500" /> Composition
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Chambres</label>
                <div className="relative">
                    <BedDouble className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="bedrooms" type="number" min="0" required className="pl-9 bg-slate-950 border-slate-800" value={formData.bedrooms} onChange={handleChange} />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Salles d'eau</label>
                <div className="relative">
                    <Bath className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="bathrooms" type="number" min="0" required className="pl-9 bg-slate-950 border-slate-800" value={formData.bathrooms} onChange={handleChange} />
                </div>
            </div>
            
            <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Photos (URLs)</label>
                <div className="relative">
                    <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input 
                        placeholder="Collez l'URL de l'image (séparées par des virgules pour plusieurs)" 
                        className="pl-9 bg-slate-950 border-slate-800" 
                        value={imagesInput}
                        onChange={(e) => setImagesInput(e.target.value)}
                    />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">* Dans la version finale, ceci sera un module d'upload de fichiers.</p>
            </div>
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
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8"
        >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <><Save className="mr-2 w-4 h-4" /> Enregistrer le Mandat</>}
        </Button>
      </div>

    </form>
  );
}
