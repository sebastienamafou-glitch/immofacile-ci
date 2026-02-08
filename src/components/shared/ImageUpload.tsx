"use client";

import { useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner"; // Ajout pour le feedback utilisateur

interface ImageUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
  onRemove: (value: string) => void;
}

export default function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    const newUrls: string[] = [];
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    if (!cloudName) {
        toast.error("Configuration Cloudinary manquante (CLOUD_NAME).");
        setLoading(false);
        return;
    }

    // On traite chaque fichier
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      // ✅ LA CLÉ DU SUCCÈS : Utiliser le preset "Unsigned" configuré à l'étape 1
      formData.append("upload_preset", "immofacile_preset"); 
      formData.append("folder", "immofacile_listings");

      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (data.secure_url) {
            newUrls.push(data.secure_url);
        } else {
            console.error("Erreur Cloudinary:", data);
            toast.error("Échec de l'upload d'une image.");
        }
      } catch (err) {
        console.error("Erreur réseau:", err);
        toast.error("Erreur de connexion lors de l'upload.");
      }
    }

    // Mise à jour de l'état parent avec les nouvelles URLs + les anciennes
    onChange([...value, ...newUrls]);
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        {value.map((url) => (
          <div key={url} className="relative w-[200px] h-[150px] rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
            <div className="absolute top-2 right-2 z-10">
              <button
                type="button"
                onClick={() => onRemove(url)}
                className="bg-red-500/90 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-lg"
              >
                <X size={14} />
              </button>
            </div>
            {/* On utilise img standard si le domaine n'est pas configuré dans next.config.js, sinon Image */}
            <img 
              className="w-full h-full object-cover" 
              alt="Aperçu du bien" 
              src={url} 
            />
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-800 transition group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {loading ? (
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    <p className="text-xs text-orange-500 font-bold">Envoi vers le cloud...</p>
                </div>
            ) : (
                <>
                    <ImagePlus className="w-8 h-8 text-slate-500 mb-2 group-hover:text-white transition-colors" />
                    <p className="text-sm text-slate-500 group-hover:text-slate-300">
                        <span className="font-semibold text-orange-500">Cliquez pour ajouter</span> des photos
                    </p>
                    <p className="text-xs text-slate-600 mt-1">JPG, PNG (Max 5Mo)</p>
                </>
            )}
          </div>
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={handleUpload} 
            disabled={loading}
          />
        </label>
      </div>
    </div>
  );
}
