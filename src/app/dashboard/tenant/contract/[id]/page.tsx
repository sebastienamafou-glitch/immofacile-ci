"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Loader2, Download, ShieldCheck, 
  CheckCircle2, PenTool, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Swal from "sweetalert2";

interface LeaseContract {
  id: string;
  startDate: string;
  monthlyRent: number;
  depositAmount: number;
  signatureStatus: "PENDING" | "SIGNED_TENANT" | "SIGNED_OWNER" | "COMPLETED";
  documentHash?: string;
  updatedAt: string;
  property: {
    title: string;
    address: string;
    commune: string;
    description?: string;
    owner: {
      name: string;
      email: string;
      phone?: string;
    }
  }
}

export default function TenantContractPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [lease, setLease] = useState<LeaseContract | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const router = useRouter();

  // 1. CHARGEMENT
  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUser = localStorage.getItem("immouser");
        if (!storedUser) { router.push("/login"); return; }
        const currentUser = JSON.parse(storedUser);
        setUser(currentUser);

        const res = await api.get('/tenant/dashboard', {
            headers: { 'x-user-email': currentUser.email }
        });

        if (res.data.success && res.data.lease) {
            setLease(res.data.lease); 
        }
      } catch (error) {
        toast.error("Erreur lors du chargement du contrat.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router, id]);

  // 2. SIGNATURE
  const handleSignContract = async () => {
    if (!lease || !user) return;

    const result = await Swal.fire({
        title: 'Signature Officielle',
        text: "En signant, vous acceptez les termes de la Loi n° 2019-576 du 26 juin 2019 relative au bail d'habitation.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Je signe le bail',
        cancelButtonText: 'Annuler',
        background: '#0F172A',
        color: '#fff'
    });

    if (!result.isConfirmed) return;

    setSigning(true);
    try {
        const res = await api.post('/tenant/contract/sign', {
            leaseId: lease.id
        }, {
            headers: { 'x-user-email': user.email }
        });

        if (res.data.success) {
            setLease(prev => prev ? ({
                ...prev,
                signatureStatus: "SIGNED_TENANT",
                documentHash: res.data.hash,
                updatedAt: res.data.date 
            }) : null);
            toast.success("Contrat signé et horodaté !");
        }
    } catch (error) {
        toast.error("Erreur lors de la signature.");
    } finally {
        setSigning(false);
    }
  };

  // 3. TÉLÉCHARGEMENT PDF (Client-Side)
  const handleDownload = async () => {
    if(!lease) return;
    setDownloading(true);

    try {
        const html2pdf = (await import('html2pdf.js')).default;
        const element = document.getElementById('printable-contract');

        if (!element) {
            toast.error("Document introuvable.");
            setDownloading(false);
            return;
        }
        
        // ✅ CORRECTION ICI : Ajout de ': any' pour calmer TypeScript
        const opt: any = {
          margin:       [15, 15, 15, 15], 
          filename:     `Bail_Habitation_${lease.id.substring(0,8)}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(element).save();
        toast.success("Bail téléchargé avec succès.");

    } catch (error) {
        console.error("Erreur PDF:", error);
        toast.error("Erreur de génération PDF.");
    } finally {
        setDownloading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#060B18] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-12 h-12"/></div>;
  if (!lease) return <div className="text-white p-10 text-center">Contrat introuvable</div>;

  const isSigned = lease.signatureStatus !== 'PENDING';
  const signedDate = lease.updatedAt ? new Date(lease.updatedAt) : new Date();

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-200 font-sans pb-20">
        
        {/* HEADER NAVIGATION */}
        <div className="p-4 lg:p-8 pb-0 max-w-7xl mx-auto">
             <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white mb-6 pl-0">
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour au tableau de bord
            </Button>

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <ShieldCheck className={`w-8 h-8 ${isSigned ? 'text-emerald-500' : 'text-orange-500'}`} /> 
                        <span>Bail d'Habitation</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <span className="text-slate-500 text-sm font-mono">Réf: {lease.id.split('-')[0]}...</span>
                        {isSigned ? 
                            <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">CONTRAT ACTIF & SÉCURISÉ</span> 
                            : <span className="text-orange-500 text-xs font-bold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">EN ATTENTE DE SIGNATURE</span>
                        }
                    </div>
                </div>
                
                {isSigned ? (
                    <Button 
                        onClick={handleDownload} 
                        disabled={downloading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-6 rounded-xl gap-2 shadow-lg shadow-emerald-900/20"
                    >
                        {downloading ? <Loader2 className="animate-spin w-5 h-5" /> : <Download className="w-5 h-5" />}
                        {downloading ? "GÉNÉRATION..." : "TÉLÉCHARGER LE PDF"}
                    </Button>
                ) : (
                    <Button 
                        onClick={handleSignContract} 
                        disabled={signing} 
                        className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 h-12 rounded-xl gap-2 shadow-lg animate-pulse"
                    >
                        {signing ? <Loader2 className="animate-spin" /> : <PenTool className="w-5 h-5" />}
                        SIGNER LE CONTRAT
                    </Button>
                )}
            </div>
        </div>

        {/* --- ZONE DU CONTRAT JURIDIQUE (Cible PDF) --- */}
        <div className="flex justify-center px-4 pb-10">
            <div id="printable-contract" className="bg-white text-[#1f2937] p-[15mm] w-full max-w-[210mm] shadow-2xl rounded-sm">
                
                {/* EN-TÊTE LEGAL */}
                <div className="text-center border-b-2 border-black pb-4 mb-6">
                    <h1 className="text-xl font-serif font-bold tracking-tight mb-2 text-black uppercase">CONTRAT DE BAIL À USAGE D'HABITATION</h1>
                    <p className="text-slate-600 italic font-serif text-[10px]">
                        Régis par la Loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat.
                    </p>
                </div>

                {/* PARTIES */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-[11px] font-serif">
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <p className="font-bold text-[9px] uppercase tracking-widest text-slate-500 mb-1">Le Bailleur (Propriétaire)</p>
                        <p className="font-bold text-sm text-black">{lease.property.owner.name.toUpperCase()}</p>
                        <p>Domicilié(e) à Abidjan</p>
                        <p>Email : {lease.property.owner.email}</p>
                        <p>Tél : {lease.property.owner.phone || 'Non renseigné'}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <p className="font-bold text-[9px] uppercase tracking-widest text-slate-500 mb-1">Le Preneur (Locataire)</p>
                        <p className="font-bold text-sm text-black">{user?.name.toUpperCase()}</p>
                        <p>Agissant en son nom personnel</p>
                        <p>Email : {user?.email}</p>
                        <p>Tél : {user?.phone || 'Non renseigné'}</p>
                    </div>
                </div>

                {/* CORPS DU CONTRAT (Articles de Loi) */}
                <div className="space-y-4 text-justify font-serif text-[10px] leading-relaxed">
                    <p className="font-bold mb-2">IL A ÉTÉ ARRÊTÉ ET CONVENU CE QUI SUIT :</p>

                    <div>
                        <h3 className="font-bold text-black underline mb-1 text-[11px]">ARTICLE 1 : OBJET ET CONSISTANCE</h3>
                        <p>
                            Le Bailleur donne en location au Preneur, qui accepte, les locaux à usage d'habitation sis à 
                            <strong> {lease.property.commune}, {lease.property.address}</strong>. 
                            Le bien loué, objet du présent bail, consiste en : <strong>{lease.property.title}</strong>. 
                            Le Preneur déclare bien connaître les lieux pour les avoir visités.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black underline mb-1 text-[11px]">ARTICLE 2 : DURÉE ET RENOUVELLEMENT</h3>
                        <p>
                            Le présent bail est consenti pour une durée ferme d'un (1) an, commençant à courir le 
                            <strong> {new Date(lease.startDate).toLocaleDateString('fr-FR', { dateStyle: 'long'})}</strong>. 
                            Il se renouvellera ensuite par tacite reconduction pour la même durée, sauf congé donné par l'une des parties 
                            par acte extrajudiciaire ou lettre recommandée avec avis de réception, au moins trois (3) mois à l'avance.
                        </p>
                    </div>

                    <div className="bg-slate-50 p-2 border border-slate-200">
                        <h3 className="font-bold text-black underline mb-1 text-[11px]">ARTICLE 3 : CONDITIONS FINANCIÈRES</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Loyer Mensuel :</strong> Le loyer est fixé à la somme principale de <span className="font-bold">{lease.monthlyRent.toLocaleString()} FCFA</span>.</li>
                            <li><strong>Date de paiement :</strong> Le loyer est payable d'avance au plus tard le 05 de chaque mois.</li>
                            <li><strong>Dépôt de Garantie (Caution) :</strong> Le Preneur verse ce jour la somme de <span className="font-bold">{lease.depositAmount.toLocaleString()} FCFA</span>, correspondant à deux (2) mois de loyer, conformément à la réglementation en vigueur.</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-black underline mb-1 text-[11px]">ARTICLE 4 : RÉVISION DU LOYER</h3>
                        <p>
                            Conformément à la Loi, le loyer pourra être révisé tous les trois (3) ans. La majoration ne pourra excéder 
                            la variation de l'indice de référence des loyers publié par l'autorité compétente.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black underline mb-1 text-[11px]">ARTICLE 5 : OBLIGATIONS ET ENTRETIEN</h3>
                        <p>
                            <strong>Le Preneur est tenu :</strong> De payer le loyer aux termes convenus, d'user paisiblement des lieux ("en bon père de famille"), 
                            d'assurer l'entretien courant et les menues réparations locatives. Il est responsable des dégradations survenant pendant la location.<br/>
                            <strong>Le Bailleur est tenu :</strong> De délivrer un logement décent, d'assurer au locataire la jouissance paisible des lieux et d'effectuer 
                            toutes les grosses réparations (structure, toiture) nécessaires au maintien en état du logement.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black underline mb-1 text-[11px]">ARTICLE 6 : CLAUSE RÉSOLUTOIRE</h3>
                        <p>
                            À défaut de paiement d'un seul terme de loyer à son échéance, ou d'inexécution d'une seule des clauses du bail, 
                            et un mois après un simple commandement de payer ou une mise en demeure restée infructueuse, le bail sera résilié de plein droit 
                            si bon semble au Bailleur.
                        </p>
                    </div>
                </div>

                {/* SIGNATURES */}
                <div className="mt-6 pt-4 border-t-2 border-black">
                    <p className="mb-4 text-[10px]">
                        Fait à Abidjan, le <strong>{new Date().toLocaleDateString('fr-FR', {dateStyle: 'long'})}</strong>, en deux exemplaires originaux électroniques faisant foi.
                    </p>
                    
                    <div className="flex justify-between gap-6">
                        {/* BAILLEUR */}
                        <div className="w-1/2">
                            <p className="font-bold uppercase text-[9px] mb-2 text-slate-600">LE BAILLEUR (Lu et approuvé)</p>
                            <div className="h-20 border border-slate-300 bg-white p-2 flex flex-col justify-end">
                                <p className="text-[8px] text-slate-400 font-mono text-center">Signature électronique en attente</p>
                            </div>
                        </div>

                        {/* PRENEUR */}
                        <div className="w-1/2">
                            <p className="font-bold uppercase text-[9px] mb-2 text-slate-600">LE PRENEUR (Lu et approuvé)</p>
                            {isSigned ? (
                                <div className="h-20 border-2 border-emerald-600 bg-emerald-50/50 p-2 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1" />
                                    <p className="text-emerald-800 font-bold text-[9px] uppercase">Signé numériquement</p>
                                    <p className="text-emerald-700 text-[8px] font-bold truncate w-full">{user?.name}</p>
                                    <p className="text-emerald-600 text-[7px]">{signedDate.toLocaleString()}</p>
                                </div>
                            ) : (
                                <div className="h-20 border border-dashed border-slate-400 bg-slate-50 p-2 flex items-center justify-center">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase italic">Emplacement Signature</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="mt-6 pt-2 border-t border-slate-200 text-center">
                    <p className="text-[7px] text-slate-400 font-sans">
                        Ce document est un titre exécutoire certifié par ImmoFacile • ID : {lease.id} • Page 1/1
                    </p>
                </div>

            </div>
        </div>
    </div>
  );
}
