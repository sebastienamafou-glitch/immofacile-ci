'use client'

import { useState } from "react";
import { signContractAction } from "@/app/dashboard/tenant/actions"; 
import { Button } from "@/components/ui/button";
import { Loader2, Download, PenTool, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";

interface ContractActionsProps {
  leaseId: string;
  isSigned: boolean;
  userName: string;
}

export default function ContractActions({ leaseId, isSigned, userName }: ContractActionsProps) {
  const [loading, setLoading] = useState(false);

  // GESTION SIGNATURE (Rien ne change ici, c'est parfait)
  const handleSign = async () => {
    const result = await Swal.fire({
        title: 'Signature Officielle',
        text: "En cliquant sur signer, vous acceptez irrévocablement les termes du bail régis par la Loi n° 2019-576.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ea580c',
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
        }
    } catch (e) {
        toast.error("Erreur de connexion.");
    } finally {
        setLoading(false);
    }
  };

  // ✅ CORRECTION MAJEURE : On appelle l'API sécurisée au lieu de faire un screenshot
  const handleDownload = () => {
    toast.info("Téléchargement du document certifié...");
    // Cette route génère le PDF côté serveur avec PDFKit, incluant le QR Code et le Hash
    window.open(`/api/tenant/leases/${leaseId}/download`, '_blank');
  };

  if (isSigned) {
      return (
        <Button 
            onClick={handleDownload} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-6 rounded-xl shadow-lg shadow-emerald-200 transition-all"
        >
            <Download className="w-5 h-5 mr-2" />
            Télécharger le Bail Certifié (PDF)
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
