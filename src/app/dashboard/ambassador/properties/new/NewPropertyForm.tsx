"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud, X, CheckCircle, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PropertyType } from "@prisma/client";
import Link from "next/link";

interface PropertyFormData {
  title: string;
  description: string;
  address: string;
  commune: string;
  price: number | "";
  type: PropertyType;
  bedrooms: number | "";
  bathrooms: number | "";
  surface: number | "";
  images: string[];
}

const INITIAL_FORM_STATE: PropertyFormData = {
    title: "", description: "", address: "", commune: "", price: "", 
    type: "APPARTEMENT", bedrooms: "", bathrooms: "", surface: "", images: []
};

export default function NewPropertyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Nouveaux états pour le Growth Hacking
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState("");

  const [formData, setFormData] = useState<PropertyFormData>(INITIAL_FORM_STATE);

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
        uploadData.append("upload_preset", "babimmo_properties");

        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: "POST", body: uploadData,
        });
        const data = await res.json();
        if (data.secure_url) uploadedUrls.push(data.secure_url);
      }

      setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      toast.success(`${uploadedUrls.length} image(s) ajoutée(s)`, { id: toastId });
    } catch (error) {
      toast.error("Erreur lors de l'upload", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/ambassador/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.propertyId) {
        toast.success("Annonce publiée avec succès !");
        setCreatedPropertyId(data.propertyId);
        setIsSuccess(true); // Bloque la redirection et affiche l'écran de succès
        router.refresh();
      } else {
        throw new Error(data.error || "Erreur lors de la création");
      }
    } catch (error) {
        if (error instanceof Error) toast.error(error.message);
        else toast.error("Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  // Logique pour copier le message d'approche
  const handleCopyMessage = () => {
    const propertyUrl = `${window.location.origin}/properties/${createdPropertyId}`;
    const locationInfo = formData.address ? `${formData.commune} (${formData.address})` : formData.commune;
    
    const message = `Bonjour, j'ai vu votre annonce pour "${formData.title}" à ${locationInfo}. Pour vous aider à trouver un locataire plus vite et sécuriser vos loyers, je l'ai mise en valeur sur Babimmo. \n\nRegardez le résultat ici : ${propertyUrl}\n\nDites-moi ce que vous en pensez !`;
    
    navigator.clipboard.writeText(message);
    toast.success("Message copié ! Vous pouvez le coller sur Facebook/WhatsApp.");
  };

  // Réinitialiser le formulaire pour enchaîner
  const handleReset = () => {
      setFormData(INITIAL_FORM_STATE);
      setCreatedPropertyId("");
      setIsSuccess(false);
  };

  // 🟢 ÉCRAN DE SUCCÈS (Le Growth Hack)
  if (isSuccess) {
      return (
          <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Annonce en ligne !</h2>
              <p className="text-slate-500 mb-8 max-w-md">L'annonce est prête. Copiez le message ci-dessous et envoyez-le au propriétaire sur Facebook ou WhatsApp.</p>

              <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 text-left relative">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap font-medium">
                      Bonjour, j'ai vu votre annonce pour "{formData.title}" à {formData.address ? `${formData.commune} (${formData.address})` : formData.commune}. Pour vous aider à trouver un locataire plus vite et sécuriser vos loyers, je l'ai mise en valeur sur Babimmo.
                      <br/><br/>
                      Regardez le résultat ici : <br/>
                      <span className="text-orange-500 font-bold break-all">{window.location.origin}/properties/{createdPropertyId}</span>
                      <br/><br/>
                      Dites-moi ce que vous en pensez !
                  </p>
                  
                  <button 
                      onClick={handleCopyMessage}
                      className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition"
                  >
                      <Copy className="w-4 h-4" /> Copier le message
                  </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Link href={`/properties/${createdPropertyId}`} target="_blank" className="flex-1">
                      <button className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-sm">
                          <ExternalLink className="w-4 h-4" /> Voir l'annonce
                      </button>
                  </Link>
                  <button 
                      onClick={handleReset}
                      className="flex-1 bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition"
                  >
                      <RefreshCw className="w-4 h-4" /> Nouvelle annonce
                  </button>
              </div>
          </div>
      );
  }

  // 🟡 FORMULAIRE CLASSIQUE
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-slate-700">Titre de l'annonce *</label>
          {/* ✅ Ajout de text-slate-900 et placeholder:text-slate-400 */}
          <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 outline-none" placeholder="Ex: Magnifique Villa 4 pièces..." />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Type de bien *</label>
          <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PropertyType})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:border-orange-500 outline-none">
            {["APPARTEMENT", "VILLA", "STUDIO", "MAGASIN", "BUREAU", "TERRAIN"].map(t => (
                <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Loyer mensuel (FCFA) *</label>
          <input type="number" required min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:border-orange-500 outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Commune *</label>
          <input type="text" required value={formData.commune} onChange={e => setFormData({...formData, commune: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 outline-none" placeholder="Ex: Cocody" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Adresse exacte / Quartier</label>
          <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 outline-none" placeholder="Ex: Rue des Jardins" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Chambres</label>
          <input type="number" min="0" value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:border-orange-500 outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Douches / Salles de bain</label>
          <input type="number" min="0" value={formData.bathrooms} onChange={e => setFormData({...formData, bathrooms: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:border-orange-500 outline-none" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Description détaillée</label>
        <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 outline-none resize-none" placeholder="Décrivez les atouts du bien..." />
      </div>

      {/* Upload Images */}
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

      <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-4 rounded-xl transition flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(15,23,42,0.2)]">
        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Publier et générer le message"}
      </button>
    </form>
  );
}
