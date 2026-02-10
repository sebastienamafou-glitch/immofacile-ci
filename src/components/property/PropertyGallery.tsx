"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Grid } from "lucide-react";

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sécurité si pas d'images
  const safeImages = images && images.length > 0 ? images : ["/placeholder.jpg"];

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % safeImages.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
  };

  return (
    <>
      {/* --- GRILLE D'AFFICHAGE (Desktop & Mobile) --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 h-[400px] md:h-[500px] rounded-3xl overflow-hidden relative group">
        
        {/* Image Principale (Grande à gauche) */}
        <div 
          onClick={() => openLightbox(0)}
          className="md:col-span-2 md:row-span-2 relative cursor-pointer hover:opacity-95 transition"
        >
          <Image 
            src={safeImages[0]} 
            alt={title} 
            fill 
            className="object-cover" 
            priority
          />
        </div>

        {/* Images Secondaires (Grille à droite) */}
        {safeImages.slice(1, 5).map((img, idx) => (
          <div 
            key={idx} 
            onClick={() => openLightbox(idx + 1)}
            className="hidden md:block relative cursor-pointer hover:opacity-95 transition"
          >
            <Image 
              src={img} 
              alt={`${title} - photo ${idx + 2}`} 
              fill 
              className="object-cover" 
            />
          </div>
        ))}

        {/* Bouton "Voir toutes les photos" si plus de 5 images */}
        <button 
            onClick={() => openLightbox(0)}
            className="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-slate-900 px-4 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-white transition"
        >
            <Grid className="w-4 h-4" />
            Voir les {safeImages.length} photos
        </button>
      </div>

      {/* --- LIGHTBOX (PLEIN ÉCRAN) --- */}
      {isOpen && (
        <div 
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)} // Fermer en cliquant à côté
        >
            {/* Bouton Fermer */}
            <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2 bg-white/10 rounded-full transition">
                <X className="w-8 h-8" />
            </button>

            {/* Navigation Gauche */}
            <button 
                onClick={prevImage}
                className="absolute left-4 md:left-8 text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition hidden md:block"
            >
                <ChevronLeft className="w-8 h-8" />
            </button>

            {/* Image Centrale */}
            <div className="relative w-full h-full max-w-6xl max-h-[85vh] p-4 flex items-center justify-center">
                <Image 
                    src={safeImages[currentIndex]} 
                    alt="Plein écran" 
                    fill 
                    className="object-contain" 
                    quality={100}
                />
            </div>

            {/* Navigation Droite */}
            <button 
                onClick={nextImage}
                className="absolute right-4 md:right-8 text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition hidden md:block"
            >
                <ChevronRight className="w-8 h-8" />
            </button>

            {/* Compteur bas de page */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 font-medium bg-black/50 px-4 py-1 rounded-full text-sm">
                {currentIndex + 1} / {safeImages.length}
            </div>
        </div>
      )}
    </>
  );
}
