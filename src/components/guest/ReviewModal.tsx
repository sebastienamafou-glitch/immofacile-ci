"use client";

import { useState } from "react";
import { Star, Loader2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea"; // Assurez-vous d'avoir ce composant ou utilisez <textarea> standard
import { toast } from "sonner";
import { createReview } from "@/actions/reviews";

export default function ReviewModal({ listingId, listingTitle }: { listingId: string, listingTitle: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0); // Pour l'effet visuel au survol

  const handleSubmit = async () => {
    if (rating === 0) {
        toast.error("Veuillez sélectionner une note.");
        return;
    }

    setLoading(true);
    try {
      const result = await createReview(listingId, rating, comment);
      if (result.success) {
        toast.success("Merci pour votre avis !");
        setIsOpen(false);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Impossible d'envoyer l'avis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 gap-2">
            <Star className="w-4 h-4" /> Noter le séjour
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <MessageSquarePlus className="w-5 h-5 text-orange-500"/>
             Notez votre séjour
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Comment s'est passé votre séjour à <strong>{listingTitle}</strong> ?
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
            {/* SÉLECTEUR D'ÉTOILES */}
            <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110 focus:outline-none"
                    >
                        <Star 
                            className={`w-8 h-8 transition-colors ${
                                star <= (hoverRating || rating) 
                                    ? "text-orange-500 fill-orange-500" 
                                    : "text-slate-600"
                            }`} 
                        />
                    </button>
                ))}
            </div>
            
            <div className="text-center text-sm font-bold text-orange-500 h-5">
                {hoverRating === 1 && "À éviter"}
                {hoverRating === 2 && "Moyen"}
                {hoverRating === 3 && "Bien"}
                {hoverRating === 4 && "Très bien"}
                {hoverRating === 5 && "Exceptionnel !"}
            </div>

            {/* COMMENTAIRE */}
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience avec les futurs voyageurs..."
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none resize-none placeholder:text-slate-600"
            />
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || rating === 0}
            className="bg-orange-600 hover:bg-orange-500 text-white w-full"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : null}
            Publier mon avis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
