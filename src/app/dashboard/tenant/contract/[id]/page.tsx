import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ContractActions from "@/components/tenant/contract-actions";
// ✅ CORRECTION : Utilisation de Canvas pour que le QR s'affiche sur le PDF
import { QRCodeCanvas } from "qrcode.react"; 
import { ShieldCheck, ArrowLeft, Building2 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function TenantContractPage({ params }: { params: { id: string } }) {
  const { id } = await params; // Accès asynchrone aux params (Next.js 15)

  // 1. SÉCURITÉ & SESSION
  const session = await auth();
  
  // Vérification stricte
  if (!session?.user?.id) return redirect("/auth/login");
  const userId = session.user.id;

  // 2. RÉCUPÉRATION DES DONNÉES (SCHEMA STRICT)
  const lease = await prisma.lease.findUnique({
    where: { id },
    include: {
        property: {
            include: {
                owner: { select: { id: true, name: true, email: true, phone: true } },
                agency: true // Inclusion de l'agence pour affichage du mandat
            }
        },
        // Relation 'signatures' conforme au schema.prisma
        signatures: { 
            include: { 
                signer: { select: { id: true, name: true } } 
            } 
        } 
    }
  });

  // 3. VÉRIFICATIONS D'ACCÈS
  if (!lease) return notFound();
  if (lease.tenantId !== userId) return redirect("/dashboard/tenant");

  const user = session.user;
  const isTenantSigned = lease.signatureStatus !== 'PENDING';
  
  // 4. LOGIQUE INTELLIGENTE DE DÉTECTION DES SIGNATAIRES
  
  // A. Trouver la signature du Locataire (Moi)
  const tenantProof = lease.signatures.find(p => p.signerId === lease.tenantId);
  
  // B. Trouver la signature du "Bailleur" (Celui qui n'est pas le locataire)
  const bailleurProof = lease.signatures.find(p => p.signerId !== lease.tenantId);

  // C. Détection : Est-ce une signature par Mandat ?
  // Si l'ID du signataire bailleur est DIFFERENT de l'ID du propriétaire => C'est un Agent/Agence
  const isMandateSignature = bailleurProof && bailleurProof.signerId !== lease.property.owner.id;

  // D. Préparation des variables d'affichage
  const ownerName = lease.property.owner.name || "LE PROPRIÉTAIRE";
  const agencyName = lease.property.agency?.name;
  
  // Nom à afficher dans le cadre : Soit l'Agent (si mandat), soit le Proprio
  const bailleurSignerName = isMandateSignature ? bailleurProof?.signer.name : ownerName;

  // 5. FORMATAGE DES DONNÉES
  const startDate = lease.startDate ? new Date(lease.startDate).toLocaleDateString('fr-FR', { dateStyle: 'long'}) : "....................";
  
  const formatAuditDate = (date: Date) => {
      return date.toLocaleString('fr-FR', { 
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 print:bg-white print:pb-0">
        
        {/* HEADER DASHBOARD (Caché à l'impression) */}
        <div className="bg-[#0B1120] text-white pt-8 pb-12 px-4 lg:px-8 print:hidden">
            <div className="max-w-5xl mx-auto">
                <Link href="/dashboard/tenant" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour au tableau de bord
                </Link>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black flex items-center gap-3 mb-2">
                            <ShieldCheck className={`w-8 h-8 ${isTenantSigned ? 'text-emerald-500' : 'text-orange-500'}`} /> 
                            <span>Contrat de Bail</span>
                        </h1>
                        <p className="text-slate-400 flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> 
                            {lease.property.title}
                        </p>
                    </div>

                    <div>
                        {/* Le bouton "SIGNER" s'affichera ici grâce à ce composant */}
                        <ContractActions 
                            leaseId={lease.id} 
                            isSigned={isTenantSigned} 
                            userName={user.name || "Locataire"}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* --- DOCUMENT OFFICIEL --- */}
        <div className="flex justify-center -mt-8 px-4 print:mt-0 print:px-0 print:block">
            <div id="printable-contract" className="bg-white text-slate-900 p-[20mm] w-[210mm] min-h-[297mm] shadow-2xl rounded-sm border border-slate-200 print:shadow-none print:border-0 print:w-full mx-auto text-justify leading-relaxed">
                
                {/* 1. EN-TÊTE LEGAL */}
                <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                    <div className="flex-1 pr-4"> 
                        <h1 className="text-2xl font-serif font-black uppercase tracking-wide mb-2">Contrat de Bail <br/>à Usage d'Habitation</h1>
                        <p className="text-[10px] italic text-slate-500 font-serif">
                            Soumis aux dispositions impératives de la Loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat.
                        </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                         <div className="border border-slate-800 p-1">
                            {/* ✅ QR CODE CANVAS : Visible à l'impression PDF */}
                            <QRCodeCanvas 
                                value={`https://immofacile.ci/compliance/${lease.id}`} 
                                size={65}
                                level={"H"} // Haute correction d'erreur
                                marginSize={1}
                            />
                         </div>
                         <span className="text-[8px] font-mono font-bold text-slate-400">AUTH: {lease.id.substring(0,6).toUpperCase()}</span>
                    </div>
                </div>

                {/* 2. LES PARTIES */}
                <div className="mb-8 font-serif text-sm">
                    <p className="font-bold text-base border-b border-black mb-4 pb-1 uppercase">ENTRE LES SOUSSIGNÉS :</p>
                    
                    <div className="mb-4 pl-4 border-l-2 border-slate-200">
                        <p><strong>LE BAILLEUR :</strong> {ownerName.toUpperCase()}</p>
                        {/* Mention Mandataire si applicable */}
                        {lease.property.agency && (
                            <p className="text-xs mt-0.5 text-slate-600">Représenté par son mandataire : <strong>L'Agence {lease.property.agency.name}</strong></p>
                        )}
                        <p className="text-xs text-slate-500 mt-1 italic">Ci-après dénommé "Le Bailleur".</p>
                    </div>

                    <div className="pl-4 border-l-2 border-slate-200">
                        <p><strong>LE PRENEUR :</strong> {user.name?.toUpperCase() || "LE LOCATAIRE"}</p>
                        <p>Contact : {user.email}</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Ci-après dénommé "Le Preneur".</p>
                    </div>
                </div>

                <p className="font-serif text-center font-bold text-sm italic mb-6">
                    IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :
                </p>

                {/* 3. CLAUSES OBLIGATOIRES (12 ARTICLES COMPLETS) */}
                <div className="space-y-4 font-serif text-[10px] text-slate-800 mb-8">
                    
                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 1 : Désignation des Lieux</h3>
                        <p>
                            Le Bailleur donne en location au Preneur, qui accepte, les locaux situés à : <strong>{lease.property.title}, {lease.property.address}</strong>. 
                            Le bien comprend : {lease.property.bedrooms} chambre(s), {lease.property.bathrooms} salle(s) d'eau. 
                            Le Preneur déclare prendre les lieux dans l'état où ils se trouvent lors de l'entrée en jouissance.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 2 : Durée du Bail</h3>
                        <p>
                            Le bail est conclu pour une durée de <strong>UN (1) AN</strong> à compter du <strong>{startDate}</strong>. 
                            Il se renouvellera par tacite reconduction pour la même durée, sauf dénonciation par l'une des parties par acte extrajudiciaire ou lettre recommandée avec accusé de réception, moyennant un préavis de trois (3) mois.
                        </p>
                    </div>

                    <div className="bg-slate-50 p-2 -mx-2 border-l-4 border-slate-300">
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 3 : Loyer et Dépôt de Garantie</h3>
                        <p className="mb-1">
                            Loyer mensuel : <strong className="text-sm mx-1">{lease.monthlyRent.toLocaleString()} FCFA</strong> payable d'avance.
                        </p>
                        <p>
                            Dépôt de garantie : <strong>{lease.depositAmount.toLocaleString()} FCFA</strong>. 
                            Cette somme ne pourra en aucun cas s'imputer sur le paiement des loyers et sera restituée au Preneur après l'état des lieux de sortie, déduction faite des sommes dues au titre des réparations locatives.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 4 : Paiement et Pénalités</h3>
                        <p>
                            Le loyer est exigible le 05 de chaque mois. Tout retard de paiement au-delà du 10 du mois entraînera de plein droit l'application d'une pénalité de 10% sur le montant dû, sans préjudice de l'action en résiliation.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 5 : Obligations du Preneur</h3>
                        <p>
                            Le Preneur s'oblige à : 
                            1) Payer le loyer aux termes convenus. 
                            2) User paisiblement des locaux suivant la destination bourgeoise prévue. 
                            3) Entretenir les lieux en bon état de réparations locatives (plomberie, électricité, serrures, vitres).
                            4) Ne pas troubler la jouissance paisible des voisins.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 6 : Obligations du Bailleur</h3>
                        <p>
                            Le Bailleur est tenu de : 
                            1) Délivrer au Preneur le logement en bon état d'usage et de réparation. 
                            2) Assurer au Preneur la jouissance paisible du logement. 
                            3) Entretenir les locaux en état de servir à l'usage prévu par le contrat (grosses réparations, clos et couvert).
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 7 : Travaux et Transformations</h3>
                        <p>
                            Le Preneur ne pourra faire aucuns travaux de transformation ou de perçage de gros œuvre sans l'accord écrit et préalable du Bailleur. 
                            À défaut d'accord, le Bailleur pourra exiger la remise en état des lieux aux frais du Preneur lors de son départ.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 8 : Cession et Sous-location</h3>
                        <p>
                            Toute cession de bail ou sous-location, même partielle ou temporaire, est <strong>strictement interdite</strong> sans l'accord écrit du Bailleur. En cas de non-respect, le bail sera résilié immédiatement de plein droit.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 9 : Droit de Visite</h3>
                        <p>
                            Le Bailleur ou son représentant pourra visiter les lieux pour vérifier leur état d'entretien, sur rendez-vous pris 48h à l'avance. 
                            En cas de mise en vente ou de relocation, le Preneur devra laisser visiter les lieux deux heures par jour les jours ouvrables.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 10 : Clause Résolutoire</h3>
                        <p>
                            À défaut de paiement d'un seul terme de loyer à son échéance ou d'inexécution d'une seule des conditions du bail, et un mois après un commandement de payer ou une mise en demeure resté infructueux, le bail sera résilié de plein droit si bon semble au Bailleur.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 11 : État des Lieux</h3>
                        <p>
                            Un état des lieux contradictoire sera établi lors de la remise des clés et lors de leur restitution. À défaut d'état des lieux de sortie, le Preneur sera présumé avoir reçu les lieux en bon état de réparations locatives.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 12 : Élection de Domicile et Litiges</h3>
                        <p>
                            Pour l'exécution des présentes, les parties font élection de domicile en leurs demeures respectives. En cas de litige, compétence est attribuée aux tribunaux du lieu de situation de l'immeuble.
                        </p>
                    </div>
                </div>

                {/* 4. SIGNATURES AVEC AUDIT TRAIL (LOGIQUE INTELLIGENTE) */}
                <div className="mt-auto pt-4 border-t-2 border-black font-sans">
                    <p className="mb-6 text-xs text-right italic font-serif">
                        Fait à Abidjan, le <strong>{new Date().toLocaleDateString('fr-FR', {dateStyle: 'long'})}</strong>, en deux exemplaires originaux.
                    </p>
                    
                    <div className="flex justify-between gap-6 mt-4">
                        
                        {/* === CADRE TECHNIQUE : BAILLEUR (Auto-adaptatif Mandat/Direct) === */}
                        <div className="w-1/2">
                            <p className="text-[10px] font-bold uppercase mb-2 underline font-serif">Le Bailleur (ou son Mandataire)</p>
                            
                            {bailleurProof ? (
                                <div className={`border-2 p-3 rounded-sm bg-white text-left ${isMandateSignature ? 'border-purple-600' : 'border-emerald-600'}`}>
                                    {/* TITRE DU CADRE */}
                                    <p className={`${isMandateSignature ? 'text-purple-600' : 'text-emerald-600'} font-bold text-sm uppercase mb-3`}>
                                        {isMandateSignature ? "SIGNÉ PAR MANDAT (P/O)" : "SIGNÉ ÉLECTRONIQUEMENT"}
                                    </p>
                                    
                                    {/* DÉTAILS TECHNIQUES */}
                                    <div className="font-mono text-[9px] text-slate-500 space-y-1.5 leading-tight">
                                        
                                        {/* Si Mandat : On affiche POUR QUI on signe */}
                                        {isMandateSignature && (
                                            <p className="font-bold text-black">POUR: AGENCE {agencyName?.toUpperCase()}</p>
                                        )}
                                        
                                        <p>
                                            <span className="font-bold mr-2">Signataire:</span> 
                                            {bailleurSignerName?.toUpperCase()}
                                        </p>
                                        <p>
                                            <span className="font-bold mr-2">Date:</span> 
                                            {formatAuditDate(new Date(bailleurProof.signedAt))}
                                        </p>
                                        <p>
                                            <span className="font-bold mr-2">IP:</span> 
                                            {bailleurProof.ipAddress}
                                        </p>
                                        <p className="truncate">
                                            <span className="font-bold mr-2">Preuve ID:</span> 
                                            {bailleurProof.id.split('-')[0].toUpperCase()}...
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                                    <p className="text-[9px] text-slate-400 italic">En attente de signature</p>
                                </div>
                            )}
                        </div>

                        {/* === CADRE TECHNIQUE : PRENEUR (MOI) === */}
                        <div className="w-1/2">
                            <p className="text-[10px] font-bold uppercase mb-2 underline font-serif">Le Preneur (Lu et approuvé)</p>
                            
                            {isTenantSigned && tenantProof ? (
                                <div className="border-2 border-blue-600 p-3 rounded-sm bg-white text-left">
                                    <p className="text-blue-600 font-bold text-sm uppercase mb-3">
                                        SIGNÉ ÉLECTRONIQUEMENT
                                    </p>
                                    <div className="font-mono text-[9px] text-slate-500 space-y-1.5 leading-tight">
                                        <p>
                                            <span className="text-blue-700 font-bold mr-2">Signataire:</span> 
                                            {user.name?.toUpperCase() || "LOCATAIRE"}
                                        </p>
                                        <p>
                                            <span className="text-blue-700 font-bold mr-2">Date:</span> 
                                            {formatAuditDate(new Date(tenantProof.signedAt))}
                                        </p>
                                        <p>
                                            <span className="text-blue-700 font-bold mr-2">IP:</span> 
                                            {tenantProof.ipAddress}
                                        </p>
                                        <p className="truncate">
                                            <span className="text-blue-700 font-bold mr-2">Preuve ID:</span> 
                                            {tenantProof.id.split('-')[0].toUpperCase()}...
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                                    <p className="text-[9px] text-slate-400 italic">Zone de signature</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
                
                {/* Footer Légal */}
                <div className="mt-8 pt-2 border-t border-slate-200 text-center">
                    <p className="text-[8px] text-slate-400 font-mono">
                        Document certifié par ImmoFacile.ci • Audit ID: {lease.id} • Page 1/1
                    </p>
                </div>

            </div>
        </div>
    </div>
  );
}
