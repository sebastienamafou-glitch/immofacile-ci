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
  
  // ✅ NOUVEL ÉTAT : Garde en mémoire l'image affichée en grand
  const [selectedMainIndex, setSelectedMainIndex] = useState(0);

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

  // ✅ LOGIQUE DE SWAP : On prend toutes les images SAUF celle qui est déjà en grand
  // Et on en garde maximum 4 pour remplir la grille de droite.
  const thumbnails = safeImages
    .map((img, index) => ({ img, index }))
    .filter((item) => item.index !== selectedMainIndex)
    .slice(0, 4);

  return (
    <>
      {/* --- GRILLE D'AFFICHAGE (Desktop & Mobile) --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 h-[400px] md:h-[500px] rounded-3xl overflow-hidden relative group">
        
        {/* Image Principale (Grande à gauche) */}
        <div 
          onClick={() => openLightbox(selectedMainIndex)} // Ouvre la Lightbox
          className="md:col-span-2 md:row-span-2 relative cursor-pointer hover:opacity-95 transition"
        >
          <Image 
            src={safeImages[selectedMainIndex]} 
            alt={title} 
            fill 
            className="object-cover transition-all duration-300" 
            priority
          />
        </div>

        {/* Images Secondaires (Grille à droite) */}
        {thumbnails.map((item) => (
          <div 
            key={item.index} 
            // ✅ LE CLIC MAGIQUE : Remplace l'image principale par cette miniature !
            onClick={() => setSelectedMainIndex(item.index)}
            className="hidden md:block relative cursor-pointer group/thumb overflow-hidden"
          >
            <Image 
              src={item.img} 
              alt={`${title} - photo ${item.index + 1}`} 
              fill 
              className="object-cover transition-transform duration-500 group-hover/thumb:scale-110" 
            />
            {/* Petit voile noir qui disparait au survol pour dynamiser l'UI */}
            <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-transparent transition-colors duration-300"></div>
          </div>
        ))}

        {/* Bouton "Voir toutes les photos" si plus de 5 images */}
        {safeImages.length > 5 && (
          <button 
              onClick={() => openLightbox(0)}
              className="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-slate-900 px-4 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-white transition hover:scale-105"
          >
              <Grid className="w-4 h-4" />
              Voir les {safeImages.length} photos
          </button>
        )}
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
                className="absolute left-4 md:left-8 text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition hidden md:block z-10"
            >
                <ChevronLeft className="w-8 h-8" />
            </button>

            {/* Image Centrale (Avec stopPropagation ajouté pour éviter de fermer en cliquant sur l'image) */}
            <div 
                className="relative w-full h-full max-w-6xl max-h-[85vh] p-4 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()} 
            >
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
                className="absolute right-4 md:right-8 text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition hidden md:block z-10"
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
