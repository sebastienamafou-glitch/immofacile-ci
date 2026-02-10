'use client'

import { useState } from "react";
import { signLeaseAsAgencyAction } from "@/app/dashboard/agency/actions";
import { Button } from "@/components/ui/button";
import { Loader2, PenTool, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";

interface AgencyActionsProps {
  leaseId: string;
}

export default function AgencyContractActions({ leaseId }: AgencyActionsProps) {
  const [loading, setLoading] = useState(false);

  // ACTION : SIGNATURE PAR MANDAT (P/O)
  const handleSign = async () => {
    const result = await Swal.fire({
        title: 'Validation par Mandat',
        text: `En tant que gestionnaire, vous allez signer ce bail "Pour Ordre" (P/O) au nom du propriétaire. Cette action engage votre agence.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#7c3aed', // Purple 600 (Couleur Agence)
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Valider et Signer (P/O)',
        cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
        const res = await signLeaseAsAgencyAction(leaseId);
        
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Bail validé par mandat avec succès !");
            // Le Server Component parent se rechargera via revalidatePath
        }
    } catch (e) {
        console.error(e);
        toast.error("Erreur technique lors de la signature.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Button 
        onClick={handleSign} 
        disabled={loading} 
        className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-bold shadow-md animate-pulse"
    >
        {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <PenTool className="w-4 h-4"/>}
        Signer le Mandat (P/O)
    </Button>
  );
}
