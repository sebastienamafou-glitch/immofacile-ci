"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toggleWishlist } from "@/actions/wishlist";
import { toast } from "sonner";

export default function RemoveFavoriteButton({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    setLoading(true);
    try {
      const result = await toggleWishlist(listingId);
      if (result.success && result.action === "removed") {
        toast.success("Favori supprimé.");
      } else if (!result.success) {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Impossible de supprimer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
        onClick={handleRemove}
        disabled={loading}
        className="p-2 bg-black/50 backdrop-blur rounded-full text-white hover:bg-red-500 transition disabled:opacity-50"
        title="Retirer des favoris"
    >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}
