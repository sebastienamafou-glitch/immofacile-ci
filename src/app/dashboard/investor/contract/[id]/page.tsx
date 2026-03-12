"use client";

import React, { useState, useEffect } from 'react';
// ✅ CORRECTION 2 : Import de useParams
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { 
  ArrowLeft, Printer, PenTool, Loader2, ShieldCheck, Lock 
} from "lucide-react";
import { getContractData, sendContractOtp, signContract } from "@/actions/contract";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface ContractUser {
  name: string | null;
  address: string | null;
  idType?: string | null; 
  idNumber?: string | null; 
}

// ✅ CORRECTIONS 1 & 3 : Ajout du ROI et alignement de 'signedAt'
interface InvestmentContractData {
  id: string;
  status: string; 
  signedAt: string | Date; 
  amount: number;
  roi: number; 
  packName: string | null;
  user: ContractUser;
}

// ✅ CORRECTION 2 : Suppression de l'interface PageProps (inutile avec useParams)
export default function InvestorContractPage() {
  const router = useRouter();
  const params = useParams();
  
  // ✅ CORRECTION 2 : Extraction sécurisée côté client
  const contractId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [contractData, setContractData] = useState<InvestmentContractData | null>(null);
  
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signStep, setSignStep] = useState<1 | 2>(1); 
  const [otp, setOtp] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!contractId) return;

      try {
        const res = await getContractData(contractId);
        
        if (res.error) {
          toast.error(res.error);
          router.push("/dashboard/investor"); 
        } else if (res.contract) {
          setContractData(res.contract as InvestmentContractData);
        }
      } catch (error) {
        toast.error("Erreur de chargement du contrat.");
        router.push("/dashboard/investor");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [contractId, router]);

  const handleSendCode = async () => {
    setIsProcessing(true);
    try {
      const res = await sendContractOtp(contractId);
      if (res.success) {
        setSignStep(2);
        toast.success("Code de sécurité envoyé !");
      } else {
        toast.error(res.error || "Erreur d'envoi");
      }
    } catch (error) {
      toast.error("Erreur de communication avec le serveur.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsProcessing(true);
    try {
      const res = await signContract(contractId, otp);
      
      if (res.success) {
        setIsSignModalOpen(false);
        // ✅ CORRECTION 3 : Utilisation de signedAt
        setContractData((prev) => 
          prev ? { ...prev, status: 'ACTIVE', signedAt: new Date() } : null
        );
        
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        toast.success("Contrat signé et validé sur la Blockchain.");
      } else {
        toast.error(res.error || "Code invalide");
      }
    } catch (error) {
       toast.error("Erreur lors de la signature.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#525252] text-white"><Loader2 className="animate-spin w-8 h-8"/></div>;
  if (!contractData) return null;

  const isSigned = contractData.status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-[#525252] py-8 print:py-0 print:bg-white font-serif text-black">
      
      {/* BARRE D'ACTION */}
      <div className="fixed top-0 left-0 w-full h-16 bg-[#0B1120] text-white flex items-center justify-between px-6 shadow-xl z-50 print:hidden">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-300 hover:text-white gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <div className="flex items-center gap-4">
            {isSigned && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest border border-emerald-500/30 px-3 py-1.5 rounded-full bg-emerald-500/10">
                    <ShieldCheck className="w-4 h-4" /> Sécurisé & Archivé
                </div>
            )}
            <Button onClick={() => window.print()} className="bg-[#F59E0B] hover:bg-orange-600 text-black font-bold gap-2">
                <Printer className="w-4 h-4" /> Imprimer / PDF
            </Button>
        </div>
      </div>

      {/* FEUILLE A4 */}
      <div className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-[20mm] relative mt-12 print:mt-0 print:w-full print:shadow-none print:m-0 text-black overflow-hidden">
        
        {/* FILIGRANE */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none rotate-45 text-6xl font-black whitespace-nowrap">
            WEBAPPCI - {contractData.status}
        </div>

        {/* EN-TÊTE */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
            <div>
                <h1 className="text-2xl font-black uppercase leading-none text-indigo-950">Protocole d'Accord</h1>
                <p className="text-sm font-bold text-slate-600 mt-1 italic">PROGRAMME : {contractData.packName?.toUpperCase() || "STANDARD"}</p>
            </div>
            <div className="text-right">
                <p className="text-xs font-bold uppercase">Réf : CTR-{contractId.slice(-8).toUpperCase()}</p>
                {/* ✅ CORRECTION 3 : Utilisation de signedAt */}
                <p className="text-[10px] text-gray-500 italic">Émis le : {new Date(contractData.signedAt).toLocaleDateString()}</p>
            </div>
        </div>

        {/* SECTION 1 : LES PARTIES */}
        <div className="grid grid-cols-2 border-2 border-black mb-8">
            <div className="border-r-2 border-black p-4 bg-slate-50">
                <p className="text-[10px] font-bold uppercase underline mb-2">LA SOCIÉTÉ (ÉMETTEUR)</p>
                <p className="font-bold text-lg">WEBAPPCI SARL</p>
                <p className="text-[10pt]">Abidjan, Cocody/Palmeraie</p>
                <p className="text-[10pt]">RCCM : CI-ABJ-34989</p>
            </div>
            <div className="p-4 relative">
                <p className="text-[10px] font-bold uppercase underline mb-2">L'INVESTISSEUR (SOUSCRIPTEUR)</p>
                
                <div className="mt-2">
                    <p className="font-bold text-lg uppercase">{contractData.user.name || "Non renseigné"}</p>
                    <p className="text-[10pt]">{contractData.user.address || "Adresse non renseignée"}</p>
                    {(contractData.user.idType || contractData.user.idNumber) && (
                        <div className="mt-2 flex items-center gap-2 text-[9pt] bg-gray-100 w-fit px-2 py-1 rounded border border-gray-300">
                            <span className="font-bold">{contractData.user.idType || "ID"} :</span> 
                            <span className="font-mono tracking-wider">{contractData.user.idNumber || "N/A"}</span>
                        </div>
                    )}
                </div>
                
                <div className="absolute top-4 right-4 opacity-50">
                     <Lock className="w-4 h-4 text-slate-400" />
                </div>
            </div>
        </div>

        {/* SECTION 2 : CONDITIONS */}
        <div className="mb-8">
            <h2 className="font-bold uppercase text-xs border-l-4 border-indigo-900 pl-2 mb-4 tracking-widest">Article 1 : Objet du Contrat</h2>
            <p className="text-[11pt] leading-relaxed text-justify mb-4">
                Le présent contrat formalise l'apport en capital de l'Investisseur pour un montant total de :
            </p>
            <div className="text-center py-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-4">
                <span className="text-2xl font-black text-indigo-900">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(contractData.amount)} FCFA
                </span>
            </div>
            {/* ✅ CORRECTION 1 : Intégration légale du ROI */}
            <p className="text-[11pt] leading-relaxed text-justify mb-4 mt-4">
                En contrepartie, la Société s'engage à verser un retour sur investissement (ROI) fixé à <strong>{contractData.roi}%</strong>, selon les conditions définies au présent programme.
            </p>
        </div>

        {/* SIGNATURES */}
        <div className="mt-20 flex justify-between gap-12 h-48 break-inside-avoid">
            <div className="flex-1 border-2 border-black p-4 relative">
                <p className="font-bold text-[10px] underline uppercase">Pour WebappCi SARL</p>
                <div className="mt-8 font-script text-2xl text-slate-400 opacity-50 rotate-[-5deg]">Signature CEO</div>
            </div>
            
            <div className="flex-1 border-2 border-black p-4 relative bg-gray-50/50">
                <p className="font-bold text-[10px] underline uppercase">Pour L'Investisseur</p>
                
                {isSigned ? (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center">
                        <div className="border-4 border-indigo-700 text-indigo-700 px-4 py-2 inline-block font-mono font-bold text-xs -rotate-6 bg-white/90 uppercase shadow-lg">
                            ✓ Signé Numériquement<br/>
                            <span className="text-[8px]">Hachage : {contractId.slice(0, 16)}...</span><br/>
                            <span className="text-[8px]">{new Date().toLocaleString()}</span>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                        En attente de signature...
                    </div>
                )}
            </div>
        </div>

        {/* FOOTER */}
        <div className="absolute bottom-8 left-0 w-full text-center text-[8pt] text-slate-400">
            Document généré et sécurisé par Babimmo Blockchain - Page 1/1
        </div>
      </div>

      {/* BOUTON DE SIGNATURE (Flottant) */}
      {!isSigned && (
         <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-2xl flex justify-between items-center z-50 print:hidden animate-in slide-in-from-bottom duration-500">
            <div className="pl-6">
                <p className="text-[10px] text-indigo-600 uppercase font-bold tracking-tighter">Action Requise</p>
                <p className="font-bold text-slate-900">Veuillez valider ce document pour activer l'investissement.</p>
            </div>
            <Button onClick={() => setIsSignModalOpen(true)} className="bg-indigo-900 hover:bg-black text-white px-8 font-bold gap-2 shadow-lg shadow-indigo-900/20">
                <PenTool className="w-4 h-4" /> Signer le Contrat
            </Button>
         </div>
      )}

      {/* MODALE OTP */}
      <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black border-2 border-indigo-900">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600"/> Signature Sécurisée
            </DialogTitle>
            <DialogDescription>
                Cette signature a la même valeur juridique qu'une signature manuscrite.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
             {signStep === 1 ? (
                <div className="space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-900 mb-4 border border-indigo-100">
                        <p className="font-bold mb-1">Résumé de l'engagement :</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Montant : {contractData.amount.toLocaleString()} FCFA</li>
                            {/* ✅ CORRECTION 1 : Intégration du ROI dans le résumé avant signature */}
                            <li>Rentabilité garantie (ROI) : {contractData.roi}%</li>
                            <li>Identité : {contractData.user.name || "N/A"} {contractData.user.idNumber ? `(${contractData.user.idNumber})` : ""}</li>
                        </ul>
                    </div>
                    <Button onClick={handleSendCode} disabled={isProcessing} className="w-full bg-indigo-950 hover:bg-indigo-900 text-white h-12">
                        {isProcessing ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : 'Recevoir mon code par SMS'}
                    </Button>
                </div>
             ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <p className="text-sm text-center text-gray-500">
                        Entrez le code à 6 chiffres reçu sur votre mobile.
                    </p>
                    <Input 
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value)} 
                        className="text-center text-3xl font-mono tracking-[0.5em] h-14 border-2 border-indigo-200 focus:border-indigo-600 focus:ring-0" 
                        placeholder="000000" 
                        maxLength={6}
                    />
                    <Button onClick={handleVerifyCode} disabled={isProcessing || otp.length < 6} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 shadow-lg shadow-emerald-900/20">
                         {isProcessing ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : 'Confirmer et Signer'}
                    </Button>
                    <button onClick={() => setSignStep(1)} className="w-full text-xs text-gray-400 hover:text-black underline">
                        Je n'ai pas reçu le code
                    </button>
                </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
