"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function GhostTracker({ propertyId }: { propertyId: string }) {
    const searchParams = useSearchParams();
    const hasTracked = useRef(false); // Empêche de compter 2 fois si React re-render

    useEffect(() => {
        // Si le paramètre ref=gh est présent et qu'on n'a pas encore tracké
        if (searchParams.get("ref") === "gh" && !hasTracked.current) {
            hasTracked.current = true;
            
            // Appel silencieux en arrière-plan (sans bloquer l'UI)
            fetch("/api/track/ghost", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ propertyId }),
            }).catch(() => {}); // On ignore les erreurs pour ne pas polluer la console du client
        }
    }, [searchParams, propertyId]);

    return null; // Composant 100% invisible
}
