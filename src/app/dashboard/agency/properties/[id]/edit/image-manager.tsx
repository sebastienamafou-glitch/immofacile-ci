'use client'

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X, UploadCloud, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ImageManagerProps {
  initialImages: string[];
}

export default function ImageManager({ initialImages }: ImageManagerProps) {
  // On gère l'état des images affichées (existantes + nouvelles previews)
  const [currentImages, setCurrentImages] = useState<string[]>(initialImages);

  // Fonction pour supprimer une image de la liste
  const removeImage = (indexToRemove: number) => {
    setCurrentImages(currentImages.filter((_, index) => index !== indexToRemove));
  };

  // Simulation d'ajout (À connecter plus tard avec votre provider d'upload réel : S3/Vercel Blob)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Pour l'instant, on crée une URL locale pour la preview
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setCurrentImages([...currentImages, previewUrl]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Galerie Photos ({currentImages.length})
        </h3>
        <Badge variant="outline">
            {currentImages.length > 0 ? "Images actives" : "Aucune image"}
        </Badge>
      </div>

      {/* Grille des images */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {currentImages.map((url, index) => (
          <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
            <Image
              src={url}
              alt={`Photo ${index + 1}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
            {/* Bouton Supprimer */}
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Input caché pour renvoyer les données au serveur lors du submit */}
            <input type="hidden" name="images" value={url} />
          </div>
        ))}

        {/* Bouton Upload (Placeholder) */}
        <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex flex-col items-center justify-center pb-6 pt-5">
                <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground text-center px-2">
                    Ajouter une photo<br/>(JPG, PNG)
                </p>
            </div>
            <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange} 
            />
        </label>
      </div>
      
      {currentImages.length === 0 && (
        <div className="flex items-center p-4 bg-yellow-500/10 text-yellow-500 rounded-md text-sm">
            <ImageIcon className="mr-2 h-4 w-4" />
            Attention : Un mandat sans photos est moins visible.
        </div>
      )}
    </div>
  );
}
