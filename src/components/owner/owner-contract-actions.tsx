'use client'

import { useState } from "react";
import { signLeaseAsOwnerAction } from "@/app/dashboard/owner/actions";
import { Button } from "@/components/ui/button";
import { Loader2, Download, PenTool } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";

interface OwnerActionsProps {
  leaseId: string;
  status: string; // "PENDING" | "SIGNED_TENANT" | "COMPLETED"
  tenantName: string;
}

export default function OwnerContractActions({ leaseId, status, tenantName }: OwnerActionsProps) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Correction : On retire "ACTIVE" si ce statut n'existe pas dans le type LeaseStatus de Prisma
  const isFullySigned = status === "COMPLETED";
  const isTenantSigned = status === "SIGNED_TENANT";

  // ACTION : CONTRE-SIGNER (Validation Propriétaire)
  const handleSign = async () => {
    const result = await Swal.fire({
        title: 'Validation Finale',
        text: `En contresignant, vous validez l'entrée de ${tenantName} et activez le bail.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#059669', // Emerald 600
        confirmButtonText: 'Valider et Signer',
        cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
        const res = await signLeaseAsOwnerAction(leaseId);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Bail validé et activé avec succès !");
            // Le Server Component parent se rechargera via revalidatePath
        }
    } catch (e) {
        toast.error("Erreur technique lors de la signature.");
    } finally {
        setLoading(false);
    }
  };

  // ACTION : TÉLÉCHARGER LE PDF DU CONTRAT
  const handleDownload = async () => {
    setDownloading(true);
    try {
        const html2pdf = (await import('html2pdf.js')).default;
        const element = document.getElementById('printable-contract');
        
        // ✅ CORRECTIF DE SÉCURITÉ (Guard Clause)
        // TypeScript sait maintenant que si on passe cette ligne, 'element' n'est pas null.
        if (!element) {
            toast.error("Document introuvable. Veuillez recharger la page.");
            setDownloading(false);
            return;
        }

        // ✅ BEST PRACTICE TYPESCRIPT
        // Utilisation de "as const" pour verrouiller les valeurs littérales
        const opt = {
          margin:       10,
          filename:     `Bail_FINAL_${leaseId.substring(0,6)}.pdf`,
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };

        await html2pdf().set(opt).from(element).save();
        toast.success("Téléchargement lancé.");
        
    } catch (err) {
        console.error(err);
        toast.error("Erreur lors de la génération du PDF.");
    } finally {
        setDownloading(false);
    }
  };

  // --- RENDU CONDITIONNEL DES BOUTONS ---

  // CAS 1 : Tout est signé (Lease COMPLETED) -> Bouton Télécharger
  if (isFullySigned) {
      return (
        <Button 
            onClick={handleDownload} 
            disabled={downloading} 
            className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-bold shadow-md"
        >
            {downloading ? <Loader2 className="animate-spin w-4 h-4"/> : <Download className="w-4 h-4"/>}
            Télécharger Bail Complet
        </Button>
      );
  }

  // CAS 2 : Le locataire a signé, c'est au tour du propriétaire -> Bouton Signer
  if (isTenantSigned) {
      return (
        <Button 
            onClick={handleSign} 
            disabled={loading} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold animate-pulse shadow-lg shadow-emerald-200"
        >
            {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <PenTool className="w-4 h-4"/>}
            Contresigner & Valider
        </Button>
      );
  }

  // CAS 3 : En attente du locataire (PENDING) -> Bouton désactivé
  return (
      <Button disabled variant="outline" className="gap-2 border-orange-200 text-orange-600 bg-orange-50 font-medium">
          <Loader2 className="w-4 h-4 animate-spin"/> En attente signature locataire...
      </Button>
  );
}
