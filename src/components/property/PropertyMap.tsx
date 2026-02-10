"use client";

import { MapPin } from "lucide-react";

interface PropertyMapProps {
  commune: string;
  address?: string;
}

export default function PropertyMap({ commune, address }: PropertyMapProps) {
  return (
    <div className="w-full h-[400px] bg-slate-100 rounded-3xl overflow-hidden relative group border border-slate-200">
      
      {/* Fond imitation carte (Pattern) */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      
      {/* Centre de la carte */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 bg-orange-500/20 rounded-full animate-ping absolute inset-0"></div>
          <div className="relative bg-white p-4 rounded-full shadow-xl border-4 border-white z-10">
            <MapPin className="w-8 h-8 text-orange-600 fill-orange-600" />
          </div>
        </div>
        
        <div className="mt-6 text-center bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-lg border border-white/20">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Localisation</p>
          <h3 className="text-xl font-black text-slate-900">{commune}</h3>
          {address && <p className="text-sm text-slate-500 font-medium mt-1">{address}</p>}
        </div>
      </div>

      {/* Bouton d'action (Fake) */}
      <div className="absolute bottom-4 right-4">
        <button className="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-slate-50 transition border border-slate-200">
            Voir sur Google Maps
        </button>
      </div>
    </div>
  );
}
