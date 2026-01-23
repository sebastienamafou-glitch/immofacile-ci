"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Palmtree, MapPin, DollarSign, Users, Save, Loader2, Bed, Bath } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ImageUpload from "@/components/shared/ImageUpload";

interface CreateListingFormProps {
  hosts: { id: string; name: string | null; email: string | null }[];
}

export default function CreateListingForm({ hosts }: CreateListingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // ✅ Clean Code : On gère des URLs (Strings)
  const [images, setImages] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    city: "Abidjan",
    neighborhood: "",
    address: "",
    pricePerNight: "",
    // ✅ Nouveaux champs Schema
    bedrooms: "1",
    bathrooms: "1",
    maxGuests: "2",
    hostId: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
        toast.error("Veuillez ajouter au moins une photo.");
        return;
    }
    
    setLoading(true);

    try {
      // ✅ Envoi JSON optimisé
      const res = await fetch("/api/agency/listings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...formData,
            images: images
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Annonce créée avec succès !");
      router.push("/dashboard/agency/listings");
      router.refresh();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-10">
      
      {/* 1. PHOTOS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Palmtree className="text-orange-500" /> Photos du bien
        </h3>
        <ImageUpload 
            value={images} 
            onChange={(urls) => setImages(urls)}
            onRemove={(url) => setImages(images.filter((current) => current !== url))}
        />
      </div>

      {/* 2. INFOS GÉNÉRALES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-white font-bold text-lg mb-6">Détails de l'annonce</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
                <label className="label-text">Titre de l'annonce</label>
                <Input name="title" placeholder="Ex: Loft Luxueux Zone 4" required className="bg-slate-950 border-slate-800 text-white" value={formData.title} onChange={handleChange} />
            </div>

            <div>
                <label className="label-text">Propriétaire (Hôte)</label>
                <Select onValueChange={(val) => handleSelectChange("hostId", val)} required>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                        <SelectValue placeholder="Sélectionner un hôte" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {hosts.map(h => (
                            <SelectItem key={h.id} value={h.id}>{h.name} ({h.email})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <label className="label-text">Prix par nuit (FCFA)</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="pricePerNight" type="number" placeholder="45000" required className="pl-9 bg-slate-950 border-slate-800 text-white" value={formData.pricePerNight} onChange={handleChange} />
                </div>
            </div>

            <div className="col-span-2">
                <label className="label-text">Description</label>
                <Textarea name="description" placeholder="Description..." className="bg-slate-950 border-slate-800 text-white min-h-[100px]" value={formData.description} onChange={handleChange} />
            </div>
        </div>
      </div>

      {/* 3. CAPACITÉ & LOCALISATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-white font-bold text-lg mb-6 flex gap-2"><Users size={20} className="text-blue-500" /> Capacité</h3>
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="label-text">Voyageurs</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-3 h-3 w-3 text-slate-500" />
                        <Input name="maxGuests" type="number" className="pl-8 bg-slate-950 border-slate-800 text-white" value={formData.maxGuests} onChange={handleChange} />
                    </div>
                </div>
                <div>
                    <label className="label-text">Chambres</label>
                    <div className="relative">
                        <Bed className="absolute left-3 top-3 h-3 w-3 text-slate-500" />
                        <Input name="bedrooms" type="number" className="pl-8 bg-slate-950 border-slate-800 text-white" value={formData.bedrooms} onChange={handleChange} />
                    </div>
                </div>
                <div>
                    <label className="label-text">SDB</label>
                    <div className="relative">
                        <Bath className="absolute left-3 top-3 h-3 w-3 text-slate-500" />
                        <Input name="bathrooms" type="number" className="pl-8 bg-slate-950 border-slate-800 text-white" value={formData.bathrooms} onChange={handleChange} />
                    </div>
                </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-white font-bold text-lg mb-6 flex gap-2"><MapPin size={20} className="text-emerald-500" /> Localisation</h3>
            <div className="space-y-4">
                <Input name="city" placeholder="Ville" className="bg-slate-950 border-slate-800 text-white" value={formData.city} onChange={handleChange} />
                <Input name="neighborhood" placeholder="Quartier (ex: Biétry)" className="bg-slate-950 border-slate-800 text-white" value={formData.neighborhood} onChange={handleChange} />
                <Input name="address" placeholder="Adresse exacte" className="bg-slate-950 border-slate-800 text-white" value={formData.address} onChange={handleChange} />
            </div>
          </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <><Save className="mr-2 w-4 h-4" /> Publier l'annonce</>}
        </Button>
      </div>

      <style jsx global>{`
        .label-text {
            display: block;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 0.5rem;
        }
      `}</style>
    </form>
  );
}
