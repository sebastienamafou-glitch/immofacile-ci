"use client";

import { MapPin, ExternalLink } from "lucide-react";

interface PropertyMapProps {
  commune: string;
  address?: string;
}

export default function PropertyMap({ commune, address }: PropertyMapProps) {
  // 1. Construction de la requête de recherche dynamique
  // On ajoute "Côte d'Ivoire" pour aider Google Maps à bien cibler le pays
  const searchQuery = encodeURIComponent(`${address ? address + ', ' : ''}${commune}, Côte d'Ivoire`);
  
  // 2. URL de l'iframe intégrée (100% Gratuite, sans clé API)
  const mapUrl = `https://maps.google.com/maps?q=${searchQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  
  // 3. URL pour le bouton d'ouverture vers le vrai site/app Google Maps
  const externalLink = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;

  return (
    <div className="w-full h-[400px] bg-slate-100 rounded-3xl overflow-hidden relative group border border-slate-200 shadow-inner">
      
      {/* LA VRAIE CARTE INTERACTIVE */}
      <iframe 
        src={mapUrl}
        width="100%" 
        height="100%" 
        style={{ border: 0 }} 
        allowFullScreen={false} 
        loading="lazy" 
        referrerPolicy="no-referrer-when-downgrade"
        // Petit filtre CSS pour l'intégrer au design (légèrement désaturée jusqu'au survol)
        className="absolute inset-0 z-0 grayscale-[30%] contrast-[1.05] opacity-90 transition-all duration-700 group-hover:grayscale-0 group-hover:opacity-100"
      ></iframe>

      {/* OVERLAY UI (Cartouche d'information en haut à gauche) */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-white/20 flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-full">
                <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Zone approximative</p>
              <p className="text-sm font-black text-slate-900 leading-none">{commune}</p>
            </div>
        </div>
      </div>

      {/* BOUTON D'ACTION RÉEL (Redirige vers l'app Google Maps) */}
      <div className="absolute bottom-4 right-4 z-10">
        <a 
          href={externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white text-slate-900 px-4 py-2.5 rounded-xl text-xs font-black shadow-xl hover:bg-slate-50 transition border border-slate-200 flex items-center gap-2 hover:scale-105 active:scale-95"
        >
            Ouvrir dans Maps <ExternalLink className="w-4 h-4 text-slate-500" />
        </a>
      </div>
      
    </div>
  );
}
