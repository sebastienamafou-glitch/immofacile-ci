"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // ✅ Suggestion utile : N'enregistrer le SW qu'en production pour éviter les bugs de cache en dev
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker actif (Scope: ", registration.scope, ")");
          })
          .catch((error) => {
            // 🛡️ FIX POUR SENTRY & GOOGLEBOT
            // Les robots (comme Google) rejettent souvent l'installation du SW.
            // On ignore silencieusement cette erreur précise pour ne pas polluer les logs.
            const errorMessage = error?.message || error?.toString() || "";
            if (errorMessage.includes("Rejected")) {
              return; // On s'arrête là, pas de console.error
            }
            
            console.error("Erreur Service Worker :", error);
          });
      };

      // Si la page est déjà chargée, on enregistre immédiatement
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
      }
    }
  }, []);

  return null;
}
