'use client'

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { X, UploadCloud, Loader2, Image as ImageIcon } from "lucide-react";
import { getCloudinarySignature } from "@/lib/cloudinary"; // Import de l'action créée étape 1

interface ImageUploadProps {
  defaultImages?: string[];
  maxFiles?: number;
}

export default function ImageUpload({ defaultImages = [], maxFiles = 5 }: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(defaultImages);
  const [isUploading, setIsUploading] = useState(false);

  // 1. GESTION DE L'UPLOAD VERS CLOUDINARY
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} images autorisées.`);
      return;
    }

    setIsUploading(true);

    try {
      // Pour chaque fichier sélectionné
      const uploadPromises = Array.from(files).map(async (file) => {
        
        // A. Récupérer la signature sécurisée depuis le serveur
        const { timestamp, signature } = await getCloudinarySignature();

        // B. Préparer le payload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!); // Vérifiez que cette var est dans le .env
        formData.append("timestamp", timestamp.toString());
        formData.append("signature", signature);
        // formData.append("folder", "immofacile_listings"); // Optionnel : organiser dans un dossier

        // C. Envoyer à Cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData }
        );

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Upload failed");

        return data.secure_url; // L'URL finale sécurisée (HTTPS)
      });

      // D. Attendre que tout soit fini
      const newUrls = await Promise.all(uploadPromises);
      setImages((prev) => [...prev, ...newUrls]);

    } catch (error) {
      console.error("Erreur Upload:", error);
      alert("Erreur lors de l'envoi des images. Veuillez réessayer.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-4">
      {/* Grille des miniatures */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((url, index) => (
          <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
            <Image
              src={url}
              alt="Listing photo"
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
            {/* L'ASTUCE : Input hidden pour envoyer l'URL au formulaire parent */}
            <input type="hidden" name="images" value={url} />
          </div>
        ))}

        {/* Bouton Upload */}
        {images.length < maxFiles && (
          <label className={`
            flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed 
            ${isUploading ? "opacity-50 cursor-not-allowed bg-muted" : "cursor-pointer hover:border-primary/50 hover:bg-muted/50"}
            transition-all border-muted-foreground/25
          `}>
            <div className="flex flex-col items-center justify-center pb-6 pt-5 text-center px-2">
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                  <p className="text-xs text-muted-foreground">Envoi en cours...</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Ajouter des photos</p>
                  <p className="text-xs text-muted-foreground mt-1">(Max {maxFiles})</p>
                </>
              )}
            </div>
            <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                multiple
                disabled={isUploading}
                onChange={handleFileChange} 
            />
          </label>
        )}
      </div>
      
      {images.length === 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-md text-sm">
            <ImageIcon className="h-4 w-4" />
            <span>Conseil : Ajoutez au moins 3 photos haute qualité.</span>
        </div>
      )}
    </div>
  );
}
