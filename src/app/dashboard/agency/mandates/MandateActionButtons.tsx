"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { processMandateAction } from "./actions";

export default function MandateActionButtons({ mandateId }: { mandateId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (action: "ACCEPT" | "REFUSE") => {
    startTransition(async () => {
      const result = await processMandateAction(mandateId, action);
      if (result.success) {
        toast.success(action === "ACCEPT" ? "Mandat accepté !" : "Mandat refusé.");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex gap-2 mt-auto">
      <Button 
        onClick={() => handleAction("REFUSE")} 
        disabled={isPending}
        variant="outline" 
        className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-10"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
        Refuser
      </Button>
      
      <Button 
        onClick={() => handleAction("ACCEPT")} 
        disabled={isPending}
        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
        Accepter
      </Button>
    </div>
  );
}
