"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import ClaimPropertyModal from "@/components/shared/ClaimPropertyModal";

export default function ClaimBanner({ propertyId }: { propertyId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Génère un faux nombre de vues entre 3 et 12 pour le FOMO
  const randomViews = Math.floor(Math.random() * 10) + 3;

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 to-[#0B1120] text-white p-4 pt-20 md:pt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b-2 border-orange-500 z-40 relative shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/20 p-2.5 rounded-full border border-orange-500/50 hidden md:block animate-pulse">
             <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-[11px] md:text-sm font-black text-orange-400 uppercase tracking-widest mb-0.5">Avis aux professionnels</p>
            <p className="text-xs md:text-sm text-slate-300">Vous gérez ce bien ? Revendiquez-le pour recevoir vos locataires sur WhatsApp.</p>
          </div>
        </div>
        
        {/* Le bouton ouvre désormais la modale au lieu de rediriger */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto bg-orange-500 hover:bg-orange-400 text-[#0B1120] font-black px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-transform hover:scale-105 flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
        >
          C'est mon annonce
        </button>
      </div>

      <ClaimPropertyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        propertyId={propertyId} 
        viewsCount={randomViews} 
      />
    </>
  );
}
