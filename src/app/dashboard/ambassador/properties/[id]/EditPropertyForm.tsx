"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { PropertyType } from "@prisma/client";

interface EditPropertyFormProps {
  initialData: any;
  propertyId: string;
}

export default function EditPropertyForm({ initialData, propertyId }: EditPropertyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: initialData.title || "",
    description: initialData.description || "",
    address: initialData.address || "",
    commune: initialData.commune || "",
    price: initialData.price || "",
    type: initialData.type as PropertyType,
    bedrooms: initialData.bedrooms || "",
    bathrooms: initialData.bathrooms || "",
    surface: initialData.surface || "",
    images: initialData.images || []
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const toastId = toast.loading("Envoi des images...");
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("upload_preset", "babimmo_preset");

        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: "POST", body: uploadData,
        });
        
        const data = await res.json();
        
        // 🔥 L'AJOUT EST ICI : On force l'arrêt si Cloudinary renvoie une erreur (ex: 400)
        if (!res.ok) {
            throw new Error(data.error?.message || "Erreur de configuration Cloudinary");
        }

        if (data.secure_url) uploadedUrls.push(data.secure_url);
      }

      if (uploadedUrls.length > 0) {
          setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
          toast.success(`${uploadedUrls.length} image(s) ajoutée(s)`, { id: toastId });
      }
      
    } catch (error: unknown) {
      // Affichage de la vraie raison du blocage
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Échec : ${errorMessage}`, { id: toastId, duration: 5000 });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/ambassador/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Annonce mise à jour !");
        router.push("/dashboard/ambassador/properties");
        router.refresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
        if (error instanceof Error) toast.error(error.message);
        else toast.error("Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-slate-700">Titre de l'annonce *</label>
          <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-orange-500 outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Type de bien *</label>
          <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PropertyType})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-orange-500 outline-none">
            {["APPARTEMENT", "VILLA", "STUDIO", "MAGASIN", "BUREAU", "TERRAIN"].map(t => (
                <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Loyer mensuel (FCFA) *</label>
          <input type="number" required min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-orange-500 outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Commune *</label>
          <input type="text" required value={formData.commune} onChange={e => setFormData({...formData, commune: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-orange-500 outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Adresse exacte</label>
          <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-orange-500 outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Chambres</label>
          <input type="number" min="0" value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-orange-500 outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Douches</label>
          <input type="number" min="0" value={formData.bathrooms} onChange={e => setFormData({...formData, bathrooms: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-orange-500 outline-none" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Description détaillée</label>
        <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-orange-500 outline-none resize-none" />
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-6">
        <label className="text-sm font-bold text-slate-700">Photos de l'annonce</label>
        <div className="flex flex-wrap gap-4 mb-4">
            {formData.images.map((url, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt={`Upload ${i}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3"/></button>
                </div>
            ))}
            <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-slate-200 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-orange-500" /> : <UploadCloud className="w-6 h-6 text-slate-400" />}
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-4 rounded-xl transition flex justify-center items-center gap-2">
        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Enregistrer les modifications"}
      </button>
    </form>
  );
}
