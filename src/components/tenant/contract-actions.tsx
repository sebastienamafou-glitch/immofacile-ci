'use client'

import { useState } from "react";
import { signContractAction } from "@/app/dashboard/tenant/actions"; // Import de l'action
import { Button } from "@/components/ui/button";
import { Loader2, Download, PenTool } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";

interface ContractActionsProps {
  leaseId: string;
  isSigned: boolean;
  userName: string;
}

export default function ContractActions({ leaseId, isSigned, userName }: ContractActionsProps) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // GESTION SIGNATURE
  const handleSign = async () => {
    // Confirmation Solennelle
    const result = await Swal.fire({
        title: 'Signature Officielle',
        text: "En cliquant sur signer, vous acceptez irrévocablement les termes du bail régis par la Loi n° 2019-576.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ea580c', // Orange
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Oui, je signe le bail',
        cancelButtonText: 'Annuler',
        background: '#ffffff',
        color: '#000'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
        const res = await signContractAction(leaseId);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Contrat signé avec succès !");
            // Le composant serveur se rafraîchira automatiquement grâce à revalidatePath
        }
    } catch (e) {
        toast.error("Erreur de connexion.");
    } finally {
        setLoading(false);
    }
  };

  // GESTION TÉLÉCHARGEMENT PDF (Client-Side)
  const handleDownload = async () => {
    setDownloading(true);
    try {
        // Import dynamique pour éviter les erreurs SSR
        const html2pdf = (await import('html2pdf.js')).default;
        const element = document.getElementById('printable-contract');

        if (!element) {
            toast.error("Document introuvable.");
            return;
        }

        const opt = {
          margin:       10,
          filename:     `Bail_${userName.replace(/\s+/g, '_')}_${leaseId.substring(0,6)}.pdf`,
          image:        { type: 'jpeg' as const, quality: 0.98 }, 
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const } // Pareil pour l'orientation
     };

        await html2pdf().set(opt).from(element).save();
        toast.success("Téléchargement lancé.");

    } catch (error) {
        console.error(error);
        toast.error("Erreur lors de la génération PDF.");
    } finally {
        setDownloading(false);
    }
  };

  if (isSigned) {
      return (
        <Button 
            onClick={handleDownload} 
            disabled={downloading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-6 rounded-xl shadow-lg shadow-emerald-200 transition-all"
        >
            {downloading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Download className="w-5 h-5 mr-2" />}
            {downloading ? "Génération..." : "Télécharger mon Bail (PDF)"}
        </Button>
      );
  }

  return (
    <Button 
        onClick={handleSign} 
        disabled={loading} 
        className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-6 rounded-xl shadow-lg shadow-orange-200 animate-pulse transition-all"
    >
        {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <PenTool className="w-5 h-5 mr-2" />}
        SIGNER LE CONTRAT
    </Button>
  );
}
