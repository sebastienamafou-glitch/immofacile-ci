'use client';

import { useState, useRef } from 'react';
import Image from 'next/image'; // ✅ Optimisation des images
import SignatureCanvas from 'react-signature-canvas';
import { Loader2, Download, Eraser, CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { signInvestmentContract } from '@/lib/actions/contract';

interface ContractModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    amount: number;
    packName: string;
  };
  onSuccess: () => void;
}

export default function ContractModal({ user, onSuccess }: ContractModalProps) {
  const [isSigned, setIsSigned] = useState(false);
  const [loading, setLoading] = useState(false);
  const sigPad = useRef<SignatureCanvas>(null);

  const clearSignature = () => sigPad.current?.clear();

  const handleSign = async () => {
    if (sigPad.current?.isEmpty()) {
      toast.error("Votre signature est requise pour valider l'acte.");
      return;
    }

    setLoading(true);
    
    // 1. Capture de la signature + Timestamp
    const signatureImage = sigPad.current?.toDataURL('image/png');

    // 2. Envoi sécurisé
    const result = await signInvestmentContract(user.id, signatureImage);

    if (result.success) {
      toast.success("Investissement validé juridiquement !");
      setIsSigned(true);
      setTimeout(() => {
        onSuccess(); 
      }, 2000);
    } else {
      toast.error("Erreur de connexion au registre. Veuillez réessayer.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md">
      <div className="bg-white text-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        
        {/* --- EN-TÊTE CORPORATE --- */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-6">
            {/* LOGO DE L'ENTREPRISE MÈRE (Juridique) */}
            <div className="relative w-12 h-12">
                <Image 
                    src="/images/logo_webappci.png" 
                    alt="WebAppCI" 
                    fill 
                    className="object-contain" 
                />
            </div>
            <div className="h-8 w-px bg-slate-300"></div>
            {/* LOGO DU PRODUIT (Objet de l'investissement) */}
             <div className="relative w-24 h-12">
                <Image 
                    src="/images/immo_logo.png" 
                    alt="ImmoFacile" 
                    fill 
                    className="object-contain" 
                />
            </div>
          </div>

          <div className="text-right hidden md:block">
            <p className="font-bold text-slate-800 text-sm uppercase tracking-wider">Acte d'Investissement</p>
            <p className="text-xs text-slate-500 font-mono">REF: WAPP-INV-{new Date().getFullYear()}-{user.id.slice(-4).toUpperCase()}</p>
          </div>
        </div>

        {/* --- CORPS DU CONTRAT (SCROLLABLE) --- */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 font-serif text-sm leading-relaxed text-slate-800 bg-white">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* TITRE */}
            <div className="text-center border-b-2 border-black pb-6 mb-8">
              <h1 className="text-2xl md:text-3xl font-black uppercase mb-2">Contrat de Partenariat Financier</h1>
              <p className="italic text-slate-600">Sous seing privé électronique - Conforme Loi n° 2013-546 (Côte d'Ivoire)</p>
            </div>

            {/* PARTIES */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <p className="mb-4">
                <strong>ENTRE LES SOUSSIGNÉS :</strong>
              </p>
              <p className="mb-4 pl-4 border-l-4 border-[#0F172A]">
                La société <strong>WebAppCI</strong>, Société éditrice de solutions numériques,<br/>
                Siège social : Abidjan, Côte d'Ivoire.<br/>
                Représentée par son Gérant.<br/>
                Ci-après dénommée <em>"L'Entreprise"</em> ou <em>"L'Éditeur"</em>.
              </p>
              <p className="mb-4">
                <strong>ET :</strong>
              </p>
              <p className="pl-4 border-l-4 border-[#F59E0B]">
                <strong>M./Mme {user.name}</strong><br/>
                Identifiant : {user.email}<br/>
                Ci-après dénommé(e) <em>"L'Investisseur"</em>.
              </p>
            </div>

            {/* CLAUSES JURIDIQUES */}
            <div className="space-y-6 text-justify">
                <div>
                    <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500 mb-1">Article 1 : Objet du Contrat</h3>
                    <p>
                        Le présent contrat a pour objet de formaliser l'apport financier de l'Investisseur au développement de la plateforme immobilière <strong>"ImmoFacile"</strong>, propriété exclusive de WebAppCI.
                        L'Investisseur souscrit par la présente au <strong>"{user.packName}"</strong> pour un montant de <strong>{user.amount.toLocaleString('fr-FR')} FCFA</strong>.
                    </p>
                </div>

                <div>
                    <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500 mb-1">Article 2 : Destination des Fonds</h3>
                    <p>
                        Les fonds versés seront affectés exclusivement aux postes suivants : infrastructure technique (serveurs), développement logiciel (IA), marketing digital et expansion régionale de la solution ImmoFacile.
                    </p>
                </div>

                <div>
                    <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500 mb-1">Article 3 : Preuve et Signature Électronique</h3>
                    <p>
                        Les parties conviennent expressément que le présent contrat est signé par voie électronique. Conformément à la <strong>Loi n° 2013-546 du 30 juillet 2013</strong> relative aux transactions électroniques en Côte d'Ivoire, l'usage de la signature électronique via la plateforme ImmoFacile vaut identification du signataire et manifeste son consentement irrévocable au contenu de l'acte.
                        Les logs de connexion (Adresse IP, Horodatage) conservés par WebAppCI feront foi en cas de litige.
                    </p>
                </div>

                 <div>
                    <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500 mb-1">Article 4 : Juridiction Compétente</h3>
                    <p>
                        Le présent contrat est régi par le droit ivoirien et les Actes Uniformes de l'OHADA. Tout litige relatif à son interprétation ou son exécution sera soumis à la compétence exclusive du <strong>Tribunal de Commerce d'Abidjan</strong>.
                    </p>
                </div>
            </div>

            {/* ZONE DE SIGNATURE */}
            <div className="mt-12 p-6 md:p-8 border-2 border-slate-900 rounded-2xl bg-slate-50">
                <div className="flex items-center justify-center gap-2 mb-6 text-[#F59E0B]">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-wide">Zone de Consentement Légal</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Partie WebAppCI (Auto) */}
                    <div className="opacity-70 pointer-events-none">
                        <p className="font-bold text-xs uppercase mb-3">Pour WebAppCI (L'Éditeur)</p>
                        <div className="h-32 bg-white border border-slate-300 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
                             <div className="absolute inset-0 opacity-5 bg-repeat [background-image:linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000),linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000)] [background-size:20px_20px] [background-position:0_0,10px_10px]"></div>
                             <Image src="/images/logo_webappci.png" width={40} height={40} alt="Seal" className="opacity-20 mb-2 grayscale"/>
                             <span className="font-script text-3xl text-slate-800 -rotate-6">WebAppCI Direction</span>
                             <div className="text-[10px] font-mono text-slate-400 mt-2">Certificat: WAPP-AUTH-SERVER-01</div>
                             <div className="text-[10px] font-mono text-slate-400">Date: {new Date().toLocaleDateString()}</div>
                        </div>
                    </div>

                    {/* Partie Investisseur (Manuelle) */}
                    <div>
                         <p className="font-bold text-xs uppercase mb-3 text-[#F59E0B]">Pour L'Investisseur (Vous)</p>
                         <div className="border-2 border-dashed border-slate-300 bg-white rounded-lg touch-none hover:border-[#F59E0B] transition-colors relative group">
                            <SignatureCanvas 
                                ref={sigPad}
                                penColor="black"
                                velocityFilterWeight={0.7}
                                canvasProps={{
                                    className: 'sigCanvas w-full h-32 rounded-lg cursor-crosshair'
                                }} 
                            />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">Signez ici</span>
                            </div>
                         </div>
                         <div className="flex justify-between items-center mt-2">
                             <p className="text-[10px] text-slate-400">Lu et approuvé</p>
                             <button onClick={clearSignature} className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition">
                                <Eraser className="w-3 h-3"/> Recommencer
                             </button>
                         </div>
                    </div>
                </div>
            </div>

          </div>
        </div>

        {/* --- PIED DE PAGE (ACTIONS) --- */}
        <div className="p-6 border-t border-slate-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500"/>
                <span>Connexion sécurisée SSL 256-bit • IP: Enregistrée</span>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
                <button className="flex-1 md:flex-none px-6 py-3 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> <span className="hidden md:inline">Prévisualiser</span> PDF
                </button>

                <button 
                    onClick={handleSign}
                    disabled={loading || isSigned}
                    className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold text-white transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5
                        ${isSigned ? 'bg-emerald-600' : 'bg-[#020617] hover:bg-[#0F172A]'}
                    `}
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5"/> : isSigned ? 
                        <><CheckCircle className="w-5 h-5"/> Signé avec succès</> : 
                        "Signer le Contrat"
                    }
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
