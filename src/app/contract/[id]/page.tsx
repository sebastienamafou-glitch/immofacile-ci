'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2, Printer, ArrowLeft, PenTool, Download, CheckCircle, Scale } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

// --- Types ---
interface LeaseData {
  id: string;
  monthlyRent: number;
  depositAmount: number;
  startDate: string;
  signatureDate?: string;
  digitalCertificate?: string;
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
  
  const [lease, setLease] = useState<LeaseData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // États Signature
  const [showSignModal, setShowSignModal] = useState(false);
  const [signStep, setSignStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
    </div>
  );

  if (!lease) return <div className="p-10 text-center">Contrat introuvable.</div>;

  // Calcul pour l'affichage de conformité
  const monthsDeposit = lease.depositAmount / lease.monthlyRent;
  const isCompliant = monthsDeposit <= 2;

  return (
    <div className="min-h-screen bg-slate-100 py-10 print:p-0 print:bg-white text-slate-900 font-sans">
      
      {/* HEADER ACTIONS */}
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
                <p>Soumis à la Loi n° 2019-576 du 26 juin 2019</p>
            </div>
        </div>

        {/* CORPS DU CONTRAT */}
        <div className="space-y-8 text-sm leading-relaxed text-justify font-medium text-slate-700">
            
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

            <section>
                <h3 className="font-bold uppercase text-xs mb-3 bg-slate-50 p-2 border-l-4 border-slate-900 text-black">2. Objet et Durée</h3>
                <div className="pl-3">
                    <p className="mb-2">
                        Le Bailleur donne en location les locaux situés à : <strong>{lease.property.address}, {lease.property.commune}</strong>.
                    </p>
                    <p>
                        Le bail est conclu pour <strong>une durée d'un (1) an renouvelable</strong>. 
                        Le délai de préavis pour résiliation est fixé à <strong>trois (3) mois</strong> conformément à la loi.
                    </p>
                </div>
            </section>

            <section>
                <h3 className="font-bold uppercase text-xs mb-3 bg-slate-50 p-2 border-l-4 border-slate-900 text-black">3. Conditions Financières</h3>
                <div className="grid grid-cols-2 gap-4 pl-3 mb-3">
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase font-bold">Loyer Mensuel</p>
                        <p className="text-lg font-black text-black">{lease.monthlyRent.toLocaleString()} FCFA</p>
                        <p className="text-[10px] text-slate-400 mt-1">Révisable tous les 3 ans</p>
                    </div>
                    <div className={`p-4 border rounded-lg ${isCompliant ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Caution (Dépôt)</p>
                                <p className={`text-lg font-black ${isCompliant ? 'text-black' : 'text-red-600'}`}>{lease.depositAmount.toLocaleString()} FCFA</p>
                             </div>
                             {isCompliant ? (
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                             ) : (
                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold">Hors Loi</span>
                             )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Soit {monthsDeposit.toFixed(1)} mois de loyer (Max légal : 2 mois)</p>
                    </div>
                </div>
            </section>

            <section className="mt-12">
                <h3 className="font-bold uppercase text-xs mb-6 bg-slate-50 p-2 border-l-4 border-slate-900 text-black">4. Signatures</h3>
                
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
                            <p className="text-center text-slate-300 text-sm mt-8">En attente...</p>
                        )}
                    </div>

                    {/* Cadre Locataire */}
                    <div className="border-2 border-dashed border-slate-300 p-6 rounded-xl relative h-32">
                        <p className="absolute -top-3 left-4 bg-white px-2 text-xs font-bold text-slate-400 uppercase">Le Preneur</p>
                        {lease.signatureDate ? (
                            <div className="h-full flex flex-col items-center justify-center text-emerald-600">
                                <CheckCircle className="w-8 h-8 mb-1" />
                                <span className="font-script text-lg font-bold">Signé électroniquement</span>
                                <span className="text-[10px] text-slate-500 mt-1">{new Date(lease.signatureDate).toLocaleDateString()}</span>
                            </div>
                        ) : (
                            <p className="text-center text-slate-300 text-sm mt-8">En attente...</p>
                        )}
                    </div>
                </div>
            </section>
        </div>

        {/* PIED DE PAGE TECHNIQUE */}
        <div className="mt-20 pt-4 border-t text-center text-[10px] text-slate-400 font-mono">
            <p>Ce document est régi par la loi Ivoirienne n° 2019-576.</p>
            <p>ID Unique : {lease.id}</p>
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
