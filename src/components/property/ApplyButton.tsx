'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner"; // On utilise Sonner (plus propre que Swal)
// Si vous tenez vraiment à Swal, gardez-le, mais Sonner est recommandé.

interface ApplyButtonProps {
  propertyId: string;
  propertyTitle: string; // ✅ C'est bien propertyTitle ici
  isLoggedIn: boolean;
  isAvailable: boolean;
  price: number;
}

export default function ApplyButton({ propertyId, propertyTitle, isLoggedIn, isAvailable, price }: ApplyButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleApply = async () => {
    // A. Gestion Auth
    if (!isLoggedIn) {
        const confirm = window.confirm("Connectez-vous pour déposer un dossier.");
        if (confirm) router.push(`/auth/login?redirect=/properties/public/${propertyId}`);
        return;
    }

    // B. Confirmation
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

        // Succès
        alert("Dossier transmis avec succès !"); // Ou toast.success()
        router.push('/dashboard/tenant');

    } catch (error: any) {
        alert(error.message); // Ou toast.error()
    } finally {
        setLoading(false);
    }
  };

  return (
    <Button 
        onClick={handleApply}
        disabled={loading}
        className="w-full bg-[#0B1120] hover:bg-orange-600 text-white font-bold h-14 rounded-xl text-lg transition-all shadow-lg hover:shadow-orange-500/30 mb-4"
    >
        {loading ? <Loader2 className="animate-spin w-5 h-5"/> : "Déposer mon dossier"}
    </Button>
  );
}
