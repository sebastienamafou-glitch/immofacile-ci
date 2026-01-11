"use client";

import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { 
  ArrowLeft, Printer, PenTool, Loader2, CheckCircle2 
} from "lucide-react";

export default function InvestorContractPage() {
  const router = useRouter();
  
  // États pour la signature électronique
  const [isSigned, setIsSigned] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signStep, setSignStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  const handleSendCode = () => {
    setIsSigning(true);
    // Simulation API envoi SMS
    setTimeout(() => {
      setSignStep(2);
      setIsSigning(false);
    }, 1500);
  };

  const handleVerifyCode = () => {
    setIsSigning(true);
    // Simulation API vérification OTP
    setTimeout(() => {
      setIsSigned(true);
      setIsSignModalOpen(false);
      setIsSigning(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#525252] py-8 print:py-0 print:bg-white font-serif text-black">
      
      {/* --- BARRE D'ACTION --- */}
      <div className="fixed top-0 left-0 w-full h-16 bg-[#0B1120] text-white flex items-center justify-between px-6 shadow-xl z-50 print:hidden">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-300 hover:text-white gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <div className="flex items-center gap-4">
            <Button onClick={() => window.print()} className="bg-[#F59E0B] hover:bg-orange-600 text-black font-bold gap-2">
                <Printer className="w-4 h-4" /> Imprimer / PDF
            </Button>
        </div>
      </div>

      {/* --- FEUILLE A4 --- */}
      <div className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-[20mm] relative mt-12 print:mt-0 print:w-full print:shadow-none print:m-0 text-black overflow-hidden">
        
        {/* FILIGRANE */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none rotate-45 text-6xl font-black">
            WEBAPPCI SARL - CONFIDENTIEL
        </div>

        {/* EN-TÊTE */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
            <div>
                <h1 className="text-2xl font-black uppercase leading-none text-indigo-950">Protocole d'Accord</h1>
                <p className="text-sm font-bold text-slate-600 mt-1 italic">INVESTISSEMENT STRATÉGIQUE V5</p>
            </div>
            <div className="text-right">
                <p className="text-xs font-bold uppercase">Réf : MOU-IVST-2025</p>
                <p className="text-[10px] text-gray-500 italic">Document de Propriété Intellectuelle</p>
            </div>
        </div>

        {/* SECTION 1 : LES PARTIES */}
        <div className="grid grid-cols-2 border-2 border-black mb-8">
            <div className="border-r-2 border-black p-4 bg-slate-50">
                <p className="text-[10px] font-bold uppercase underline mb-2">LA SOCIÉTÉ</p>
                <p className="font-bold text-lg">WEBAPPCI SARL</p>
                <p className="text-[10pt]">Abidjan, Cocody/Palmeraie</p>
                <p className="text-[10pt]">RCCM : CI-ABJ-34989</p>
            </div>
            <div className="p-4">
                <p className="text-[10px] font-bold uppercase underline mb-2">L'INVESTISSEUR</p>
                <p className="text-gray-400 italic text-sm mt-4 text-center border border-dashed border-gray-300 py-2">
                    [IDENTITÉ DU PARTENAIRE]
                </p>
            </div>
        </div>

        {/* SECTION 2 : ACTIFS TECHNIQUES */}
        <div className="mb-8">
            <h2 className="font-bold uppercase text-xs border-l-4 border-indigo-900 pl-2 mb-4 tracking-widest">Article 1 : Actifs Technologiques</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10pt]">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Stack : Node.js / Next.js</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> BDD : PostgreSQL / Prisma</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Sécurité : JWT / Chiffrement</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Tests : API Validée</div>
            </div>
        </div>

        {/* SECTION 3 : ROI */}
        <div className="mb-8 p-5 border-2 border-indigo-950 bg-indigo-50/30">
            <h2 className="font-bold uppercase text-xs underline mb-3">Article 2 : Retour sur Investissement</h2>
            <p className="text-[11pt] leading-relaxed">
                L'Investisseur bénéficie d'un intéressement financier sous forme de <strong>Revenue Share</strong>, calculé à hauteur de 
                <strong> [X]% sur les commissions de collecte</strong> générées via les modules IA et de paiement mobile de la plateforme.
            </p>
        </div>

        {/* SIGNATURES */}
        <div className="mt-20 flex justify-between gap-12 h-48 break-inside-avoid">
            <div className="flex-1 border-2 border-black p-4 relative">
                <p className="font-bold text-[10px] underline uppercase">WebappCi SARL</p>
                {isSigned && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-indigo-700 text-indigo-700 px-4 py-1 text-center font-mono font-bold text-xs -rotate-12 bg-white/95 uppercase">
                        ✓ Signé Numériquement
                    </div>
                )}
            </div>
            <div className="flex-1 border-2 border-black p-4 relative">
                <p className="font-bold text-[10px] underline uppercase">L'Investisseur</p>
                {isSigned && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-green-700 text-green-700 px-4 py-1 text-center font-mono font-bold text-xs -rotate-12 bg-white/95 uppercase">
                        ✓ Accord Validé<br/>
                        {new Date().toLocaleDateString()}
                    </div>
                )}
            </div>
        </div>

        {/* FOOTER */}
        <div className="absolute bottom-8 left-0 w-full text-center text-[8pt] text-slate-400">
            Édité par WebappCi SARL - Propriété Intellectuelle Protégée - Page 1/1
        </div>
      </div>

      {/* --- BOUTON DE SIGNATURE --- */}
      {!isSigned && (
         <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-2xl flex justify-between items-center z-50 print:hidden">
            <div className="pl-6">
                <p className="text-[10px] text-indigo-600 uppercase font-bold tracking-tighter">Partenariat Stratégique</p>
                <p className="font-bold text-slate-900">Valider ce protocole via OTP</p>
            </div>
            <Button onClick={() => setIsSignModalOpen(true)} className="bg-indigo-900 hover:bg-black text-white px-8 font-bold gap-2">
                <PenTool className="w-4 h-4" /> Signer le MOU
            </Button>
         </div>
      )}

      {/* MODALE */}
      <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black border-2 border-indigo-900">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-tight">Validation Numérique</DialogTitle>
            <DialogDescription>Confirmez votre accord via le code sécurisé envoyé par SMS.</DialogDescription>
          </DialogHeader>
          <div className="py-6">
             {signStep === 1 ? (
                <Button onClick={handleSendCode} disabled={isSigning} className="w-full bg-indigo-950 text-white h-12">
                    {isSigning ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : 'Générer mon code de signature'}
                </Button>
             ) : (
                <div className="space-y-4">
                    <Input 
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value)} 
                        className="text-center text-3xl font-mono tracking-[0.5em] h-14 border-2 border-indigo-200 focus:border-indigo-600" 
                        placeholder="000000" 
                        maxLength={6}
                    />
                    <Button onClick={handleVerifyCode} disabled={isSigning} className="w-full bg-green-700 hover:bg-green-800 text-white h-12">
                         {isSigning ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : 'Confirmer la Signature'}
                    </Button>
                </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
