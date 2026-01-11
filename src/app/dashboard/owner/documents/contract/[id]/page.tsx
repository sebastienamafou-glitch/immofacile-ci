"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { Loader2, CheckCircle, PenTool, ShieldCheck, MapPin, Calendar, User, Download } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [lease, setLease] = useState<any>(null);
  const [signing, setSigning] = useState(false);

  // On détermine "qui" regarde la page (basique pour l'UI)
  const [viewerRole, setViewerRole] = useState<'OWNER' | 'TENANT'>('TENANT');

  useEffect(() => {
    // Petit hack pour savoir si c'est le proprio qui regarde (basé sur le localStorage existant)
    const stored = localStorage.getItem("immouser");
    if (stored) {
        const user = JSON.parse(stored);
        if (user.role === 'OWNER') setViewerRole('OWNER');
    }

    const fetchContract = async () => {
        try {
            // Appel API Public
            const res = await api.get(`/contract/${id}`);
            if (res.data.success) setLease(res.data.lease);
        } catch (e) {
            toast.error("Contrat introuvable.");
        } finally {
            setLoading(false);
        }
    };
    fetchContract();
  }, [id]);

  const handleSign = async () => {
    const confirm = await Swal.fire({
        title: 'Signer électroniquement ?',
        text: "En cliquant sur confirmer, vous acceptez les termes du contrat. Votre adresse IP sera enregistrée comme preuve légale.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Oui, je signe',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#334155',
        background: '#0f172a', color: '#fff'
    });

    if (confirm.isConfirmed) {
        setSigning(true);
        try {
            const res = await api.post(`/contract/${id}`, { role: viewerRole });
            if (res.data.success) {
                Swal.fire({
                    title: 'Signé avec succès ! ✍️',
                    icon: 'success',
                    background: '#0f172a', color: '#fff',
                    timer: 2000, showConfirmButton: false
                });
                // Refresh local
                setLease({ ...lease, signatureStatus: res.data.newStatus });
            }
        } catch (e) {
            toast.error("Erreur lors de la signature.");
        } finally {
            setSigning(false);
        }
    }
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>;
  if (!lease) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">Contrat introuvable ou lien expiré.</div>;

  const isSignedByMe = 
      (viewerRole === 'TENANT' && ['SIGNED_TENANT', 'COMPLETED'].includes(lease.signatureStatus)) ||
      (viewerRole === 'OWNER' && ['SIGNED_OWNER', 'COMPLETED'].includes(lease.signatureStatus));

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 py-10 px-4 font-sans flex justify-center">
      <div className="max-w-4xl w-full space-y-6">
        
        {/* HEADER DE STATUS */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                    <ShieldCheck className="text-[#F59E0B]" /> CONTRAT DE BAIL NUMÉRIQUE
                </h1>
                <p className="text-slate-400 text-sm mt-1 font-mono">ID: {lease.id}</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-3">
                 <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-bold transition">
                    <Download className="w-4 h-4"/> Télécharger PDF
                 </button>
            </div>
        </div>

        {/* VISUALISATION DU CONTRAT (SIMULÉ HTML) */}
        <div className="bg-white text-black p-10 md:p-16 rounded-sm shadow-2xl min-h-[600px] relative">
            <h2 className="text-center font-serif text-3xl font-bold mb-10 border-b-2 border-black pb-4">CONTRAT DE LOCATION</h2>
            
            <div className="space-y-8 font-serif leading-relaxed">
                <section>
                    <h3 className="font-bold uppercase text-sm mb-2 text-slate-500">1. Les Parties</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-4 border-l-4 border-slate-300">
                            <p className="font-bold">LE BAILLEUR (Propriétaire)</p>
                            <p>{lease.property.owner.name}</p>
                            <p className="text-sm text-slate-600">{lease.property.owner.email}</p>
                        </div>
                        <div className="bg-slate-50 p-4 border-l-4 border-blue-300">
                            <p className="font-bold">LE PRENEUR (Locataire)</p>
                            <p>{lease.tenant.name}</p>
                            <p className="text-sm text-slate-600">{lease.tenant.email}</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="font-bold uppercase text-sm mb-2 text-slate-500">2. Le Bien Loué</h3>
                    <p>
                        Le Bailleur donne en location au Preneur, qui accepte, les locaux situés à :<br/>
                        <strong>{lease.property.address}, {lease.property.commune}</strong>.
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-sm text-slate-700">
                        <li>Type : {lease.property.type}</li>
                        <li>Surface : {lease.property.surface} m²</li>
                        <li>Usage : Habitation principale</li>
                    </ul>
                </section>

                <section>
                    <h3 className="font-bold uppercase text-sm mb-2 text-slate-500">3. Conditions Financières</h3>
                    <div className="flex justify-between items-center border-b border-dotted border-black pb-1 mb-2">
                        <span>Loyer Mensuel</span>
                        <span className="font-bold">{lease.monthlyRent.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-dotted border-black pb-1 mb-2">
                        <span>Caution (Garantie)</span>
                        <span className="font-bold">{lease.depositAmount.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-dotted border-black pb-1">
                        <span>Date d'entrée en vigueur</span>
                        <span className="font-bold">{new Date(lease.startDate).toLocaleDateString()}</span>
                    </div>
                </section>

                <div className="mt-12 p-6 bg-slate-100 border border-slate-300 text-center text-sm italic text-slate-600">
                    "Je déclare avoir pris connaissance des conditions générales du bail et les accepter sans réserve."
                </div>
            </div>
        </div>

        {/* BARRE D'ACTION (SIGNATURE) */}
        <div className="sticky bottom-6 z-20">
            <div className="bg-[#1E293B]/90 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isSignedByMe ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                    <span className="font-bold text-white text-sm">
                        {isSignedByMe ? "Vous avez signé ce document." : "Signature requise."}
                    </span>
                </div>

                {!isSignedByMe ? (
                    <button 
                        onClick={handleSign}
                        disabled={signing}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 flex items-center gap-2"
                    >
                        {signing ? <Loader2 className="animate-spin w-5 h-5"/> : <PenTool className="w-5 h-5"/>}
                        Signer le bail
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-emerald-400 font-bold px-4 py-2 bg-emerald-900/20 rounded-lg border border-emerald-900/50">
                        <CheckCircle className="w-5 h-5" /> Signé électroniquement
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
