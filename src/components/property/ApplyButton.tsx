'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import LeadCaptureModal from "./LeadCaptureModal";

interface ApplyButtonProps {
  propertyId: string;
  propertyTitle: string;
  isLoggedIn: boolean;
  isAvailable: boolean;
  price: number;
}

export default function ApplyButton({ propertyId, propertyTitle, isLoggedIn, isAvailable }: ApplyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleApply = async () => {
    if (!isLoggedIn) {
        setIsModalOpen(true); // Ouvre la modale au lieu de bloquer
        return;
    }

    const confirm = window.confirm(`Envoyer votre dossier pour "${propertyTitle}" au propriétaire ?`);
    if (!confirm) return;

    setLoading(true);

    try {
        const res = await fetch('/api/tenant/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");

        toast.success("Dossier transmis avec succès !");
        router.push('/dashboard/tenant');
    } catch (error: unknown) {
        if (error instanceof Error) toast.error(error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
        <Button 
            onClick={handleApply}
            disabled={loading || !isAvailable}
            className="w-full bg-[#0B1120] hover:bg-orange-600 text-white font-bold h-14 rounded-xl text-lg transition-all shadow-lg hover:shadow-orange-500/30 mb-4"
        >
            {loading ? <Loader2 className="animate-spin w-5 h-5"/> : (isAvailable ? "Déposer mon dossier" : "Déjà loué")}
        </Button>

        <LeadCaptureModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            propertyId={propertyId} 
            propertyTitle={propertyTitle} 
        />
    </>
  );
}
