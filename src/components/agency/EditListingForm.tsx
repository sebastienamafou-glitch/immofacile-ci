"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Listing } from "@prisma/client";
import { Palmtree, MapPin, DollarSign, Users, Save, Loader2, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api } from "@/lib/api"; // ✅ Wrapper Sécurisé
import ImageUpload from "@/components/dashboard/shared/ImageUpload";
import Link from "next/link";

interface EditListingFormProps {
  initialData: Listing;
}

export default function EditListingForm({ initialData }: EditListingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [images, setImages] = useState<string[]>(initialData.images);
  const [isPublished, setIsPublished] = useState(initialData.isPublished);
  
  const [formData, setFormData] = useState({
    title: initialData.title,
    description: initialData.description || "",
    city: initialData.city,
    neighborhood: initialData.neighborhood || "",
    address: initialData.address || "",
    pricePerNight: initialData.pricePerNight,
    bedrooms: initialData.bedrooms,
    bathrooms: initialData.bathrooms,
    maxGuests: initialData.maxGuests,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ PATCH SÉCURISÉ
      const res = await api.patch(`/agency/listings/${initialData.id}`, {
            ...formData,
            images,
            isPublished
      });

      if (res.data.success) {
          toast.success("Annonce mise à jour ! 🚀");
          router.refresh();
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Erreur lors de la mise à jour";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr ? Cette action est irréversible.")) return;
    
    setDeleting(true);
    try {
        // ✅ DELETE SÉCURISÉ
        await api.delete(`/agency/listings/${initialData.id}`);
        
        toast.success("Annonce supprimée");
        router.push("/dashboard/agency/listings");
    } catch (error: any) {
        const msg = error.response?.data?.error || "Erreur suppression";
        toast.error(msg);
        setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleUpdate} className="space-y-8 max-w-5xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER ACTIONS */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/agency/listings">
             <Button variant="ghost" className="text-slate-400 hover:text-white pl-0">
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
             </Button>
        </Link>
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                <span className="text-sm font-bold text-slate-400 uppercase">Statut :</span>
                <Switch 
                    checked={isPublished} 
                    onCheckedChange={setIsPublished} 
                    className="data-[state=checked]:bg-emerald-500"
                />
                <span className={`text-sm font-bold ${isPublished ? "text-emerald-500" : "text-slate-500"}`}>
                    {isPublished ? "EN LIGNE" : "BROUILLON"}
                </span>
             </div>
             <Button type="button" variant="destructive" size="icon" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
             </Button>
        </div>
      </div>

      {/* 1. PHOTOS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Palmtree className="text-orange-500" /> Gestion des Photos
        </h3>
        <ImageUpload 
            value={images} 
            onChange={(urls) => setImages(urls)}
            onRemove={(url) => setImages(images.filter((current) => current !== url))}
        />
      </div>

      {/* 2. DÉTAILS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-white font-bold text-lg mb-6">Informations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Titre</label>
                <Input name="title" required className="bg-slate-950 border-slate-800 text-white" value={formData.title} onChange={handleChange} />
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Prix / Nuit (FCFA)</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input name="pricePerNight" type="number" required className="pl-9 bg-slate-950 border-slate-800 text-white" value={formData.pricePerNight} onChange={handleChange} />
                </div>
            </div>

            <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Description</label>
                <Textarea name="description" className="bg-slate-950 border-slate-800 min-h-[100px] text-white" value={formData.description} onChange={handleChange} />
            </div>
        </div>
      </div>

      {/* 3. CAPACITÉ & ADRESSE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-white font-bold text-lg mb-6 flex gap-2"><Users size={20} className="text-blue-500" /> Configuration</h3>
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Max Invités</label>
                    <Input name="maxGuests" type="number" className="bg-slate-950 border-slate-800 text-white" value={formData.maxGuests} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Chambres</label>
                    <Input name="bedrooms" type="number" className="bg-slate-950 border-slate-800 text-white" value={formData.bedrooms} onChange={handleChange} />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">SDB</label>
                    <Input name="bathrooms" type="number" className="bg-slate-950 border-slate-800 text-white" value={formData.bathrooms} onChange={handleChange} />
                </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-white font-bold text-lg mb-6 flex gap-2"><MapPin size={20} className="text-emerald-500" /> Localisation</h3>
            <div className="space-y-4">
                <Input name="city" placeholder="Ville" className="bg-slate-950 border-slate-800 text-white" value={formData.city} onChange={handleChange} />
                <Input name="neighborhood" placeholder="Quartier" className="bg-slate-950 border-slate-800 text-white" value={formData.neighborhood} onChange={handleChange} />
                <Input name="address" placeholder="Adresse" className="bg-slate-950 border-slate-800 text-white" value={formData.address} onChange={handleChange} />
            </div>
          </div>
      </div>

      {/* FOOTER FIXED */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 p-4 z-50 flex justify-center md:pl-64">
         <Button type="submit" disabled={loading} size="lg" className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-12 shadow-xl shadow-orange-900/20 active:scale-95 transition-transform">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <><Save className="mr-2 w-5 h-5" /> Enregistrer les modifications</>}
        </Button>
      </div>
    </form>
  );
}
