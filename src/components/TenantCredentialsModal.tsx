import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, Send } from "lucide-react";
import { createWhatsAppLink } from "../lib/whatsapp";
import { useState } from "react";

interface TenantCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantName: string;
  tenantPhone: string;
  tempPass: string;
}

export function TenantCredentialsModal({ isOpen, onClose, tenantName, tenantPhone, tempPass }: TenantCredentialsModalProps) {
  const [copied, setCopied] = useState(false);
  
  const loginUrl = "https://immofacile.ci/login"; // URL de votre site en prod
  
  // Le message pré-rédigé pour le locataire
  const message = `Bonjour ${tenantName} 👋,\n\nBienvenue dans votre nouvel appartement !\n\nVoici vos accès pour payer votre loyer et retrouver votre bail sur ImmoFacile :\n\n🔗 Lien : ${loginUrl}\n📱 Identifiant : ${tenantPhone}\n🔑 Mot de passe provisoire : ${tempPass}\n\nÀ très vite !`;

  const waLink = createWhatsAppLink(tenantPhone, message);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 text-white border-slate-800">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <DialogTitle className="text-center text-xl">Bail créé avec succès !</DialogTitle>
          <DialogDescription className="text-center text-slate-400">
            Transmettez ces accès à votre locataire immédiatement pour qu'il puisse se connecter.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 my-2">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-slate-500 uppercase font-bold">Locataire</span>
                <span className="font-bold">{tenantName}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-slate-500 uppercase font-bold">Identifiant</span>
                <span className="font-mono text-[#F59E0B]">{tenantPhone}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 uppercase font-bold">Mot de passe</span>
                <span className="font-mono bg-white/10 px-2 py-1 rounded text-white">{tempPass}</span>
            </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold" asChild>
            <a href={waLink} target="_blank" rel="noopener noreferrer">
                <Send className="w-4 h-4 mr-2" /> Envoyer par WhatsApp
            </a>
          </Button>
          <Button variant="outline" onClick={handleCopy} className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
            {copied ? "Copié !" : <><Copy className="w-4 h-4 mr-2" /> Copier le message</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
