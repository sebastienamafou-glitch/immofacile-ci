"use client";

import { useState } from "react";
import { giveNoticeAction } from "@/actions/lease.actions";
import { LogOut } from "lucide-react";

export default function NoticeButton({ leaseId, tenantId }: { leaseId: string, tenantId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [departureDate, setDepartureDate] = useState("");

  const handleGiveNotice = async () => {
    if (!departureDate) return alert("Veuillez choisir une date de départ.");
    
    setIsLoading(true);
    const result = await giveNoticeAction(leaseId, new Date(departureDate), tenantId);
    setIsLoading(false);

    if (result.success) {
      alert("Votre préavis a été enregistré de manière certifiée.");
    } else {
      alert("Erreur : " + result.error);
    }
  };

  // Calcul de la date minimum (aujourd'hui) pour bloquer les saisies erronées
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="departure" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Départ le :
        </label>
        <input 
          id="departure"
          type="date" 
          min={today}
          className="bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium rounded-lg px-3 py-2 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all cursor-pointer"
          onChange={(e) => setDepartureDate(e.target.value)}
        />
      </div>
      
      <button 
        onClick={handleGiveNotice}
        disabled={isLoading}
        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogOut className="w-4 h-4" />
        {isLoading ? "Traitement..." : "Donner mon préavis"}
      </button>
    </div>
  );
}
