"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Loader2, 
  FileText, 
  Download, 
  Calendar, 
  User, 
  ShieldCheck, 
  MapPin, 
  Building2, 
  CheckCircle2, 
  Scale,
  PenTool
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import Swal from "sweetalert2";

const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

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

export default function TenantContractPage() {
  const [lease, setLease] = useState<LeaseContract | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const router = useRouter();

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
        console.error("Fetch Error:", error);
        toast.error("Erreur lors du chargement du contrat.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleSignContract = async () => {
    if (!lease || !user) return;

    const result = await Swal.fire({
        title: 'Signer le contrat ?',
        text: "En confirmant, vous apposez votre signature numérique sur ce bail à usage d'habitation.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Oui, je signe',
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

            toast.success("Contrat signé avec succès !");
        }
    } catch (error) {
        toast.error("Erreur lors de la signature.");
    } finally {
        setSigning(false);
    }
  };

  const generateLegalPDF = () => {
    if (!lease || !user || !lease.documentHash) {
        toast.error("Données de certification manquantes.");
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 0;
    const lineHeight = 6;

    const addText = (text: string, fontSize = 10, fontType = "normal", align: "left" | "center" | "justify" = "left", marginTop = 0) => {
        if (y > pageHeight - 40) { doc.addPage(); y = 20; }
        doc.setFont("times", fontType);
        doc.setFontSize(fontSize);
        y += marginTop;
        if (align === "justify") {
             const splitText = doc.splitTextToSize(text, contentWidth);
             doc.text(splitText, margin, y);
             y += (splitText.length * lineHeight * (fontSize / 10));
        } else if (align === "center") {
            doc.text(text, pageWidth / 2, y, { align: "center" });
            y += lineHeight;
        } else {
            doc.text(text, margin, y);
            y += lineHeight;
        }
    };

    // Header Design
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("CONTRAT DE LOCATION CERTIFIÉ", pageWidth - margin, 25, { align: "right" });
    doc.setFontSize(9);
    doc.text(`ID: ${lease.id.toUpperCase()}`, pageWidth - margin, 32, { align: "right" });

    // --- CORPS DU CONTRAT ---
    y = 60;
    doc.setTextColor(0, 0, 0);
    addText("CONTRAT DE BAIL À USAGE D'HABITATION", 14, "bold", "center");
    addText("Soumis à la Loi n° 2019-576 du 26 juin 2019", 9, "italic", "center", 5);

    addText("ENTRE LES SOUSSIGNÉS :", 11, "bold", "left", 15);
    addText(`1. LE BAILLEUR : ${lease.property.owner.name.toUpperCase()}`, 10, "bold", "left", 5);
    addText(`2. LE PRENEUR : ${user.name.toUpperCase()}`, 10, "bold", "left", 5);

    addText("ARTICLE 1 – OBJET", 11, "bold", "left", 10);
    addText(`Désignation : ${lease.property.title} sis à ${lease.property.address}, ${lease.property.commune}.`, 10, "normal", "justify", 3);

    addText("ARTICLE 2 – CONDITIONS FINANCIÈRES", 11, "bold", "left", 8);
    addText(`Loyer mensuel : ${lease.monthlyRent.toLocaleString()} FCFA`, 10, "normal", "left", 3);
    addText(`Dépôt de garantie : ${lease.depositAmount.toLocaleString()} FCFA`, 10, "normal", "left", 2);

    // --- BLOC DE SIGNATURE RÉELLE ---
    y = pageHeight - 75;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(15, 23, 42);
    doc.roundedRect(margin, y, contentWidth, 45, 3, 3, 'FD');

    y += 10;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text("CERTIFICATION NUMÉRIQUE", pageWidth / 2, y, { align: "center" });
    
    y += 8;
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    const signDate = new Date(lease.updatedAt).toLocaleString("fr-FR");
    doc.text(`Document signé électroniquement le : ${signDate}`, pageWidth / 2, y, { align: "center" });
    
    y += 8;
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`HASH SHA-256 : ${lease.documentHash}`, pageWidth / 2, y, { align: "center" });
    doc.text(`Certifié conforme par le protocole ImmoFacile Digital Ledger`, pageWidth / 2, y + 4, { align: "center" });

    doc.save(`Contrat_Signe_${lease.id.substring(0,8)}.pdf`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 w-12 h-12"/>
    </div>
  );

  if (!lease) return (
    <div className="min-h-screen bg-[#060B18] text-white flex flex-col items-center justify-center p-8 text-center">
        <FileText className="w-16 h-16 text-slate-700 mb-6" />
        <h2 className="text-2xl font-bold">Aucun contrat trouvé</h2>
        <Button onClick={() => router.push('/dashboard/tenant')} className="mt-6 bg-slate-800">Retour</Button>
    </div>
  );

  const isSigned = lease.signatureStatus !== 'PENDING';

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 font-sans">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                    <ShieldCheck className={`w-8 h-8 ${isSigned ? 'text-emerald-500' : 'text-orange-500'}`} /> 
                    <span>Gestion du Contrat</span>
                </h1>
                <div className="mt-2 flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${isSigned ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                        {isSigned ? 'Bail Signé & Certifié' : 'Signature Requise'}
                    </span>
                    <span className="text-slate-600 text-xs font-mono">ID: {lease.id.substring(0,8)}</span>
                </div>
            </div>
            
            {isSigned ? (
                <Button onClick={generateLegalPDF} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 h-14 rounded-2xl gap-2 shadow-xl transition-all">
                    <Download className="w-5 h-5" /> TÉLÉCHARGER LE PDF
                </Button>
            ) : (
                <Button onClick={handleSignContract} disabled={signing} className="bg-orange-600 hover:bg-orange-500 text-white font-black px-8 h-14 rounded-2xl gap-2 shadow-xl animate-pulse">
                    {signing ? <Loader2 className="animate-spin" /> : <PenTool className="w-5 h-5" />}
                    SIGNER LE CONTRAT MAINTENANT
                </Button>
            )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
                
                {/* STATUS ALERT */}
                {isSigned && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[1.5rem] flex items-center gap-5">
                        <div className="bg-emerald-500/20 p-3 rounded-xl">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-bold text-sm">Contrat validé juridiquement</p>
                            <p className="text-xs text-slate-500 font-mono mt-1 break-all">Empreinte : {lease.documentHash}</p>
                        </div>
                    </div>
                )}

                {/* PROPERTY CARD */}
                <div className="bg-[#0F172A] border border-white/5 rounded-[2rem] p-8">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-500"/> Détails de la propriété
                    </h3>
                    <h2 className="text-2xl font-bold text-white mb-2">{lease.property.title}</h2>
                    <p className="text-slate-400 flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4" /> {lease.property.address}, {lease.property.commune}
                    </p>
                </div>

                {/* TERMS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0F172A] border border-white/5 p-6 rounded-2xl">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Loyer Mensuel</p>
                        <p className="text-2xl font-black text-emerald-500">{lease.monthlyRent?.toLocaleString()} <span className="text-xs">FCFA</span></p>
                    </div>
                    <div className="bg-[#0F172A] border border-white/5 p-6 rounded-2xl">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Entrée en vigueur</p>
                        <p className="text-xl font-bold text-white">{new Date(lease.startDate).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}</p>
                    </div>
                </div>
            </div>

            {/* SIGNATORIES COLUMN */}
            <div className="space-y-6">
                <div className="bg-[#0F172A] border border-white/5 rounded-[2rem] p-8">
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500"/> Parties au contrat
                    </h3>
                    
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold">B</div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Bailleur</p>
                                <p className="text-white font-bold text-sm">{lease.property.owner.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white">L</div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Locataire (Vous)</p>
                                <p className="text-white font-bold text-sm">{user?.name}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 rounded-[2rem] p-8">
                    <Scale className="w-8 h-8 text-slate-400 mb-4" />
                    <h4 className="text-white font-bold mb-2">Conformité Légale</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Ce document constitue un titre exécutoire conformément au Code de la Construction et de l'Habitat. La signature électronique est certifiée et horodatée.
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
}
