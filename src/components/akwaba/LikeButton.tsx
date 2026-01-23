"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  listingId: string;
  initialIsLiked?: boolean;
  userEmail?: string | null; // Requis pour savoir qui like
}

export default function LikeButton({ listingId, initialIsLiked = false, userEmail }: LikeButtonProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLoading, setIsLoading] = useState(false);

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Empêche la navigation si le bouton est dans un lien
    e.stopPropagation();

    // 1. Sécurité : Si pas connecté -> Login
    if (!userEmail) {
      toast.error("Connectez-vous pour sauvegarder ce logement");
      // On redirige vers login avec retour sur cette page
      router.push(`/login?callbackUrl=${window.location.pathname}`);
      return;
    }

    // 2. Optimistic UI : On change l'apparence TOUT DE SUITE (avant la réponse serveur)
    const previousState = isLiked;
    setIsLiked(!isLiked);
    setIsLoading(true);

    try {
      const res = await fetch("/api/guest/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, userEmail }),
      });

      if (!res.ok) throw new Error("Erreur serveur");

      const data = await res.json();
      
      // Feedback utilisateur
      if (data.status === "added") {
        toast.success("Ajouté aux favoris ❤️");
      } else {
        toast.info("Retiré des favoris");
      }

    } catch (error) {
      // 3. Rollback : En cas d'erreur, on remet l'état précédent
      setIsLiked(previousState);
      toast.error("Impossible de modifier les favoris");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLike}
      disabled={isLoading}
      className={cn(
        "rounded-full w-12 h-12 transition-all duration-300 border backdrop-blur-md shadow-lg",
        isLiked 
          ? "bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20" 
          : "bg-black/20 border-white/10 text-white hover:bg-black/40 hover:scale-110"
      )}
      title={isLiked ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Heart className={cn("w-6 h-6 transition-transform", isLiked && "fill-current scale-110")} />
    </Button>
  );
}
