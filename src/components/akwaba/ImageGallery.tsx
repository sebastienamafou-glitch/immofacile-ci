"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Grid } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  // On stocke l'index de l'image principale affichée
  const [mainImageIndex, setMainImageIndex] = useState(0);

  // On s'assure d'avoir toujours au moins 5 placeholders si pas assez d'images
  const displayImages = [...images];
  while (displayImages.length < 5) {
    displayImages.push("/placeholder-house.jpg");
  }

  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[300px] md:h-[450px] rounded-2xl overflow-hidden relative group">
      {/* Image Principale (Grande) */}
      <div className="col-span-2 row-span-2 relative">
        <img
          src={displayImages[mainImageIndex]}
          alt="Main view"
          className="w-full h-full object-cover hover:opacity-95 transition cursor-pointer animate-in fade-in duration-300"
          // Pas d'action au clic sur la grande image elle-même pour l'instant
        />
      </div>

      {/* Images Secondaires (Thumbnails) */}
      {/* On prend les images de l'index 1 à 4 (les 4 petites) */}
      {[1, 2, 3, 4].map((idx) => (
        <div 
            key={idx} 
            className={`relative hidden md:block cursor-pointer ${mainImageIndex === idx ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => setMainImageIndex(idx)} // Au clic, cette image devient la principale
        >
          <img
            src={displayImages[idx]}
            alt={`View ${idx}`}
            className="w-full h-full object-cover hover:opacity-90 transition"
          />
          {mainImageIndex === idx && (
               <div className="absolute inset-0 bg-black/20 pointer-events-none" />
          )}
        </div>
      ))}

      <Button
        variant="secondary"
        className="absolute bottom-4 right-4 bg-white/90 text-black hover:bg-white text-xs font-bold shadow-lg gap-2"
      >
       <Grid className="w-4 h-4"/> Afficher les photos
      </Button>
    </div>
  );
}
