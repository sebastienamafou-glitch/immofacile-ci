'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2, Printer, ArrowLeft, PenTool, Download, CheckCircle, Scale, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

// --- Types (Alignés avec votre Schema + Frontend) ---
interface LeaseData {
  id: string;
  monthlyRent: number;
  depositAmount: number;
  startDate: string; // Présent dans le Schema Prisma
  signatureDate?: string;
  digitalCertificate?: string;
  status: string; 
  property: {
    title: string;
    type: string;
    address: string;
    commune: string;
    owner: {
      name: string;
      email: string;
      phone: string;
    };
  };
  tenant: {
    name: string;
    phone: string;
    email?: string;
    documentHash?: string;
  };
}

export default function ContractPage() {
  const { id } = useParams();
  const router = useRouter();
  
  // États de données
  const [lease, setLease] = useState<LeaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false); // Fix Hydration
  
  // États Signature
  const [showSignModal, setShowSignModal] = useState(false);
  const [signStep, setSignStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);

  // 1. Gestion du Montage (Hydration Fix)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 2. Chargement des données
  useEffect(() => {
    const fetchLease = async () => {
      try {
        const res = await api.get(`/owner/contract/${id}`);
        if (res.data.success) {
            setLease(res.data.lease);
        }
      } catch (error) {
        console.error("Erreur chargement contrat:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchLease();
  }, [id]);

  const handleSendCode = async () => {
    setIsSending(true);
    try {
        await api.post('/signature/initiate', { leaseId: id });
        setSignStep(2);
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#10B981', color: '#fff'
        });
        Toast.fire({ icon: 'success', title: 'Code envoyé par SMS' });
    } catch (error) {
        Swal.fire({ title: 'Erreur', text: "Impossible d'envoyer le code.", icon: 'error', background: '#1e293b', color: '#fff' });
    } finally {
        setIsSending(false);
    }
  };

  const handleConfirmSign = async () => {
    setIsSending(true);
    try {
        const res = await api.post('/signature/verify', { leaseId: id, otp });
        
        if (res.data.success) {
            setShowSignModal(false);
            await Swal.fire({
                title: 'Félicitations ! ✍️',
                text: 'Le contrat est signé. Il a maintenant force de loi.',
                icon: 'success',
                confirmButtonColor: '#10B981',
                background: '#1e293b', color: '#fff'
            });
            window.location.reload(); 
        }
    } catch (error) {
        Swal.fire({ title: 'Code Incorrect', text: "Vérifiez le code reçu.", icon: 'error', background: '#1e293b', color: '#fff' });
    } finally {
        setIsSending(false);
    }
  };

  // --- Rendu Conditionnel ---
  if (!isMounted) return null; // Empêche le rendu serveur/client mismatch

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
    </div>
  );

  if (!lease) return <div className="p-10 text-center">Contrat introuvable.</div>;

  // --- LOGIQUE JURIDIQUE (LOI 2019-576) ---
  const depositMonths = lease.depositAmount / lease.monthlyRent;
  const isDepositCompliant = depositMonths <= 2;
  const advanceMonths = 2; // Plafonné par la loi
  const totalEntry = lease.depositAmount + (lease.monthlyRent * advanceMonths);
  const leaseStartDate = new Date(lease.startDate).toLocaleDateString('fr-FR');

  return (
    <div className="min-h-screen bg-slate-100 py-10 print:p-0 print:bg-white text-slate-900 font-sans">
      
      {/* HEADER ACTIONS (Caché à l'impression) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center px-4 print:hidden">
        <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-slate-500 hover:text-black transition font-bold"
        >
            <ArrowLeft className="w-5 h-5" /> Retour
        </button>

        <div className="flex gap-3">
             {lease.digitalCertificate ? (
                 <a 
                    href={lease.digitalCertificate} 
                    target="_blank"
                    download={`Contrat_Bail_${lease.id}.pdf`}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition"
                 >
                    <Download className="w-4 h-4" /> Original Signé
                 </a>
             ) : (
                 <button 
                    onClick={() => window.print()}
                    className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition"
                 >
                    <Printer className="w-4 h-4" /> Imprimer
                 </button>
             )}

             {!lease.signatureDate && (
                 <button 
                    onClick={() => setShowSignModal(true)}
                    className="bg-[#F59E0B] text-black px-6 py-2 rounded-lg font-black flex items-center gap-2 shadow-lg hover:bg-yellow-400 transition"
                 >
                    <PenTool className="w-4 h-4" /> SIGNER (OTP)
                 </button>
             )}
        </div>
      </div>

      {/* FEUILLE A4 VISUELLE */}
      <div className="max-w-[210mm] mx-auto bg-white p-[20mm] shadow-2xl min-h-[297mm] relative print:shadow-none print:w-full">
        
        {/* Filigrane "PROJET" si non signé */}
        {!lease.signatureDate && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] print:opacity-10">
                <p className="text-[150px] font-black -rotate-45 text-slate-900">PROJET</p>
             </div>
        )}

        {/* EN-TÊTE AVEC MENTION LÉGALE */}
        <div className="text-center border-b-2 border-black pb-6 mb-8">
            <h1 className="text-2xl font-black uppercase tracking-widest mb-2">Contrat de Bail à Usage d'Habitation</h1>
            <div className="flex items-center justify-center gap-2 text-sm italic text-slate-600">
                <Scale className="w-4 h-4" />
                <p>Soumis à la Loi n° 2019-576 du 26 juin 2019 (Code de la Construction)</p>
            </div>
        </div>

        {/* CORPS DU CONTRAT */}
        <div className="space-y-6 text-sm leading-relaxed text-justify font-medium text-slate-700">
            
            {/* ARTICLE 1 */}
            <section>
                <h3 className="font-bold uppercase text-xs mb-3 bg-slate-50 p-2 border-l-4 border-slate-900 text-black">1. Désignation des Parties</h3>
                <div className="pl-3 space-y-2">
                    <p>
                        <span className="font-bold text-black w-32 inline-block">LE BAILLEUR :</span> 
                        M./Mme {(lease.property.owner?.name || "NON RENSEIGNÉ").toUpperCase()}
                    </p>
                    <p>
                        <span className="font-bold text-black w-32 inline-block">LE PRENEUR :</span> 
                        M./Mme {(lease.tenant?.name || "NON RENSEIGNÉ").toUpperCase()}
                    </p>
                </div>
            </section>

            {/* ARTICLE 2 */}
            <section>
                <h3 className="font-bold uppercase text-xs mb-3 bg-slate-50 p-2 border-l-4 border-slate-900 text-black">2. Objet et Durée</h3>
                <div className="pl-3">
                    <p className="mb-2">
                        Le Bailleur donne en location les locaux situés à : <strong>{lease.property.address}, {lease.property.commune}</strong> ({lease.property.type}).
                    </p>
                    <p>
                        Le bail est conclu pour <strong>une durée d'un (1) an renouvelable</strong>, prenant effet le <strong>{leaseStartDate}</strong>. 
                        Le délai de préavis pour résiliation est fixé à <strong>trois (3) mois</strong> conformément à la loi.
                    </p>
                </div>
            </section>

            {/* ARTICLE 3 - CONFORMITÉ FINANCIÈRE */}
            <section>
                <h3 className="font-bold uppercase text-xs mb-3 bg-slate-50 p-2 border-l-4 border-slate-900 text-black">3. Conditions Financières</h3>
                <div className="grid grid-cols-2 gap-4 pl-3 mb-3">
                    
                    {/* Bloc Loyer */}
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase font-bold">Loyer Mensuel</p>
                        <p className="text-lg font-black text-black">{lease.monthlyRent.toLocaleString()} FCFA</p>
                        <p className="text-[10px] text-slate-400 mt-1">Payable avant le 05 du mois</p>
                    </div>

                    {/* Bloc Caution (Logic conformité) */}
                    <div className={`p-4 border rounded-lg ${isDepositCompliant ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Caution (Dépôt)</p>
                                <p className={`text-lg font-black ${isDepositCompliant ? 'text-emerald-900' : 'text-red-900'}`}>{lease.depositAmount.toLocaleString()} FCFA</p>
                             </div>
                             {!isDepositCompliant && (
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                             )}
                        </div>
                        <p className={`text-[10px] mt-1 ${isDepositCompliant ? 'text-emerald-600' : 'text-red-600 font-bold'}`}>
                            Soit {depositMonths.toFixed(1)} mois (Max légal : 2 mois)
                        </p>
                    </div>
                </div>

                {/* Résumé des paiements à l'entrée */}
                <div className="pl-3 mt-2">
                    <div className="bg-blue-50 border border-blue-100 rounded p-3 flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-xs text-blue-900 font-bold mb-1">TOTAL À VERSER À LA SIGNATURE : {totalEntry.toLocaleString()} FCFA</p>
                            <p className="text-[11px] text-blue-700 leading-tight">
                                Ce montant inclut la caution de {lease.depositAmount.toLocaleString()} F 
                                et les {advanceMonths} mois de loyers d'avance ({ (lease.monthlyRent * 2).toLocaleString() } F), 
                                conformément au plafond fixé par la réglementation.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ARTICLE 4 - NOUVEAU */}
            <section>
                <h3 className="font-bold uppercase text-xs mb-3 bg-slate-50 p-2 border-l-4 border-slate-900 text-black">4. Obligations des Parties</h3>
                <div className="pl-3 text-xs space-y-2 text-slate-600">
                    <p>
                        <strong>Le Preneur s'engage à :</strong> Payer son loyer à la date convenue, user des lieux en "bon père de famille", effectuer les réparations locatives courantes et ne pas transformer les locaux sans accord écrit.
                    </p>
                    <p>
                        <strong>Le Bailleur s'engage à :</strong> Délivrer un logement décent, assurer la jouissance paisible des lieux et délivrer une quittance pour tout paiement reçu.
                    </p>
                </div>
            </section>

            {/* ARTICLE 5 - NOUVEAU (CLAUSE RÉSOLUTOIRE) */}
            <section>
                <h3 className="font-bold uppercase text-xs mb-3 bg-slate-50 p-2 border-l-4 border-slate-900 text-black">5. Clause Résolutoire</h3>
                <div className="pl-3 p-3 bg-slate-50 border border-slate-200 text-xs italic text-slate-600 rounded">
                    <p>
                        Il est expressément convenu qu'à défaut de paiement d'un seul terme de loyer à son échéance, ou d'inexécution d'une seule des conditions du bail, 
                        celui-ci sera résilié de plein droit <strong>un (1) mois après une mise en demeure de payer ou d'exécuter restée infructueuse</strong>.
                    </p>
                    <p className="mt-2 font-bold text-slate-800">
                        Cette mise en demeure devra être délivrée par acte d'huissier de justice, conformément aux lois en vigueur.
                    </p>
                </div>
            </section>

            {/* ARTICLE 6 - SIGNATURES */}
            <section className="mt-8 break-inside-avoid">
                <h3 className="font-bold uppercase text-xs mb-6 bg-slate-50 p-2 border-l-4 border-slate-900 text-black">6. Signatures</h3>
                
                <div className="grid grid-cols-2 gap-12">
                    {/* Cadre Bailleur */}
                    <div className="border-2 border-dashed border-slate-300 p-6 rounded-xl relative h-32">
                        <p className="absolute -top-3 left-4 bg-white px-2 text-xs font-bold text-slate-400 uppercase">Le Bailleur</p>
                        {lease.signatureDate ? (
                            <div className="h-full flex flex-col items-center justify-center text-emerald-600">
                                <CheckCircle className="w-8 h-8 mb-1" />
                                <span className="font-script text-lg font-bold">Signé électroniquement</span>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <p className="text-sm">En attente de signature...</p>
                            </div>
                        )}
                    </div>

                    {/* Cadre Locataire */}
                    <div className="border-2 border-dashed border-slate-300 p-6 rounded-xl relative h-32">
                        <p className="absolute -top-3 left-4 bg-white px-2 text-xs font-bold text-slate-400 uppercase">Le Preneur</p>
                        {lease.signatureDate ? (
                            <div className="h-full flex flex-col items-center justify-center text-emerald-600">
                                <CheckCircle className="w-8 h-8 mb-1" />
                                <span className="font-script text-lg font-bold">Signé électroniquement</span>
                                <span className="text-[10px] text-slate-500 mt-1">{new Date(lease.signatureDate).toLocaleDateString('fr-FR')}</span>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <p className="text-sm">En attente de signature...</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>

        {/* PIED DE PAGE TECHNIQUE */}
        <div className="mt-10 pt-4 border-t text-center text-[10px] text-slate-400 font-mono">
            <p>Ce document certifié est régi par la loi Ivoirienne n° 2019-576.</p>
            <p>ID Unique du contrat : {lease.id}</p>
        </div>

      </div>

      {/* --- MODALE DE SIGNATURE (INCHANGÉE) --- */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-orange-500"/> Signature Électronique
                </h3>
                
                {signStep === 1 ? (
                    <>
                        <p className="text-slate-600 text-sm mb-6">
                            Pour signer ce contrat, nous allons envoyer un code de sécurité (OTP) sur votre numéro : 
                            <strong> {lease.tenant.phone}</strong>
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowSignModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Annuler</button>
                            <button 
                                onClick={handleSendCode} 
                                disabled={isSending}
                                className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition flex justify-center"
                            >
                                {isSending ? <Loader2 className="animate-spin"/> : 'Envoyer le code'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-4">
                         <p className="text-slate-500 text-sm">Entrez le code reçu par SMS :</p>
                         <input 
                            type="text" 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="123456"
                            className="w-full text-center text-2xl tracking-widest font-bold border-2 border-slate-200 rounded-xl p-3 focus:border-orange-500 outline-none"
                            autoFocus
                         />
                         
                         <button 
                            onClick={handleConfirmSign}
                            disabled={isSending} 
                            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition flex justify-center"
                        >
                             {isSending ? <Loader2 className="animate-spin"/> : 'VALIDER LA SIGNATURE'}
                         </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
