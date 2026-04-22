'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PenTool, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { v4 as uuidv4 } from "uuid";
import { api } from "@/lib/api"; // Ton instance Axios
import { signLeaseAsTenantAction } from "@/actions/lease.actions";

interface ContractActionsProps {
  leaseId: string;
  isSigned: boolean;
  userName: string;
}

export default function ContractActions({ leaseId, isSigned, userName }: ContractActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleSignAndPay = async () => {
    // Fusion de l'alerte légale ET de la demande de numéro de paiement
    const { value: phone, isDismissed } = await Swal.fire({
      title: 'Signature Officielle',
      html: `
        <p class="text-sm text-slate-600 mb-4 text-justify">
          En cliquant sur signer, vous acceptez irrévocablement les termes du bail régis par la Loi n° 2019-576. 
          Vous serez ensuite redirigé pour régler votre <strong>Caution et Avance</strong>.
        </p>
        <input id="swal-phone" class="swal2-input" placeholder="Numéro Wave/OM (ex: 0700000000)" type="tel">
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Oui, je signe le bail',
      cancelButtonText: 'Annuler',
      background: '#ffffff',
      color: '#000',
      preConfirm: () => {
        const input = document.getElementById('swal-phone') as HTMLInputElement;
        const phoneVal = input?.value;
        if (!/^(01|05|07)\d{8}$/.test(phoneVal)) {
          Swal.showValidationMessage('Format ivoirien invalide (10 chiffres requis, ex: 07...)');
        }
        return phoneVal;
      }
    });

    if (isDismissed || !phone) return;

    setLoading(true);

    try {
      // 1. SIGNATURE ÉLECTRONIQUE
      const signRes = await signLeaseAsTenantAction(leaseId);
      
      if (signRes?.error) {
        toast.error(signRes.error);
        setLoading(false);
        return;
      }

      toast.success("Signature validée ! Redirection vers le paiement...");

      // 2. INITIALISATION DU PAIEMENT (API CinetPay)
      const idempotencyKey = uuidv4();
      
      const payload = {
        type: 'DEPOSIT', 
        referenceId: leaseId,
        idempotencyKey,
        phone: phone
      };

      // Si ton fichier backend est bien api/payment/route.ts
      const paymentRes = await api.post("/payment/initiate", payload); 

      if (paymentRes.data.success && paymentRes.data.paymentUrl) {
        // Redirection vers le guichet CinetPay
        window.location.href = paymentRes.data.paymentUrl;
      } else {
        throw new Error("URL de paiement non reçue.");
      }

    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erreur lors de l'initialisation du paiement.");
      setLoading(false); // S'assurer que le bouton se débloque en cas d'erreur API
    }
  };

  // On conserve ta logique de téléchargement PDF !
  const handleDownload = () => {
    toast.info("Préparation du document. Choisissez 'Enregistrer au format PDF'.");
    setTimeout(() => {
        window.print();
    }, 500);
  };

  if (isSigned) {
      return (
        <Button 
            onClick={handleDownload} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-6 rounded-xl shadow-lg shadow-emerald-200 transition-all"
        >
            <Download className="w-5 h-5 mr-2" />
            Télécharger le Bail (PDF)
        </Button>
      );
  }

  return (
    <Button 
        onClick={handleSignAndPay} 
        disabled={loading} 
        className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-6 rounded-xl shadow-lg shadow-orange-200 animate-pulse transition-all"
    >
        {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <PenTool className="w-5 h-5 mr-2" />}
        SIGNER LE CONTRAT
    </Button>
  );
}
