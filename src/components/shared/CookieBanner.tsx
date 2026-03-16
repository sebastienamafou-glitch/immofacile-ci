"use client";

import { useState, useEffect } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

// Typage strict des états possibles
type ConsentStatus = "PENDING" | "GRANTED" | "DENIED";

export default function CookieBanner() {
  const [consent, setConsent] = useState<ConsentStatus>("PENDING");
  const [isMounted, setIsMounted] = useState(false); // Pour éviter l'erreur d'hydratation Next.js

  useEffect(() => {
    setIsMounted(true);
    // Vérification initiale : on regarde si un choix a déjà été fait
    const stored = localStorage.getItem("cookie_consent") as ConsentStatus | null;
    if (stored) {
      setConsent(stored);
    }
  }, []);

  const handleConsent = (status: "GRANTED" | "DENIED") => {
    localStorage.setItem("cookie_consent", status);
    setConsent(status);
  };

  // On ne rend rien côté serveur pour éviter le décalage UI (Hydration mismatch)
  if (!isMounted) return null;

  return (
    <>
      {/* 🚀 LE CŒUR DU RGPD : Google Analytics n'est injecté QUE si GRANTED */}
      {consent === "GRANTED" && <GoogleAnalytics gaId="G-36JC3KB6E5" />}

      {/* BANNIÈRE UI */}
      {consent === "PENDING" && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl z-[9999] animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-orange-500/20 p-2 rounded-full shrink-0">
              <Cookie className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Respect de votre vie privée</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Nous utilisons des cookies analytiques pour comprendre comment vous utilisez Babimmo et améliorer notre service.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleConsent("DENIED")}
              className="flex-1 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-9"
            >
              Refuser
            </Button>
            <Button 
              onClick={() => handleConsent("GRANTED")}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs h-9 shadow-lg shadow-orange-600/20"
            >
              Accepter
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
