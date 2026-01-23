"use client";

import { useCallback } from "react";
import Image from "next/image";
import { ImagePlus, X, Star } from "lucide-react";

interface ImageUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
  onRemove: (value: string) => void;
}

export default function ImageUpload({
  value,
  onChange,
  onRemove
}: ImageUploadProps) {

  // Fonction utilitaire pour convertir un Fichier en Base64 (DataURL)
  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // On traite chaque fichier sélectionné
    Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                // On ajoute la nouvelle image au tableau existant
                onChange([...value, event.target.result as string]);
            }
        };
        reader.readAsDataURL(file);
    });
  }, [onChange, value]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        {/* GRID DES IMAGES EXISTANTES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {value.map((url, index) => (
            <div key={url} className="relative aspect-square bg-slate-800 rounded-xl overflow-hidden group border border-slate-700">
                <div className="absolute top-2 right-2 z-10">
                    <button
                        type="button"
                        onClick={() => onRemove(url)}
                        className="p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition shadow-lg"
                    >
                        <X size={14} />
                    </button>
                </div>
                
                {/* Badge "Photo de couverture" pour la première image */}
                {index === 0 && (
                   <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                      <Star size={10} fill="currentColor" /> Couverture
                   </div>
                )}

                <Image
                    fill
                    className="object-cover"
                    alt="Image annonce"
                    src={url}
                />
            </div>
            ))}

            {/* BOUTON D'AJOUT (Input File masqué) */}
            <label className="relative aspect-square bg-slate-900/50 border-2 border-dashed border-slate-700 rounded-xl hover:border-orange-500/50 hover:bg-slate-900 transition flex flex-col items-center justify-center gap-2 cursor-pointer group">
                <div className="p-3 bg-slate-800 rounded-full group-hover:bg-orange-500/10 group-hover:text-orange-500 transition text-slate-400">
                    <ImagePlus size={24} />
                </div>
                <div className="text-xs text-slate-500 font-bold group-hover:text-slate-300">
                    Ajouter photos
                </div>
                <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={handleUpload}
                />
            </label>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        * La première photo sera utilisée comme couverture de l'annonce.
        <br/>
        * Formats acceptés : JPG, PNG, WEBP.
      </p>
    </div>
  );
}
