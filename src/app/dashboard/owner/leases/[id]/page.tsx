import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OwnerContractActions from "@/components/owner/owner-contract-actions";
import { QRCodeSVG } from "qrcode.react";
import { 
  ShieldCheck, ArrowLeft, Printer, Scale 
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function OwnerLeasePage({ params }: { params: { id: string } }) {
  const leaseId = params.id; 

  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");

  // 1. RÉCUPÉRATION DES DONNÉES AVEC LES PREUVES DE SIGNATURE
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
        property: {
            include: {
                owner: { select: { id: true, name: true, email: true } }
            }
        },
        tenant: { select: { id: true, name: true, email: true, phone: true } },
        // ✅ Relation conforme au schema.prisma
        signatures: true 
    }
  });

  // 2. SÉCURITÉ & VALIDATION
  if (!lease) return notFound();
  if (lease.property.owner.id !== session.user.id) return redirect("/dashboard/owner");

  const isCompleted = lease.signatureStatus === "COMPLETED";
  const isTenantSigned = lease.signatureStatus !== "PENDING"; 

  // 3. EXTRACTION DES PREUVES D'AUDIT
  const ownerProof = lease.signatures.find(p => p.signerId === lease.property.owner.id);
  const tenantProof = lease.signatures.find(p => p.signerId === lease.tenant.id);

  // 4. FORMATAGE
  const ownerName = lease.property.owner.name || "LE PROPRIÉTAIRE";
  const tenantName = lease.tenant.name || "LE LOCATAIRE";
  const startDate = lease.startDate ? new Date(lease.startDate).toLocaleDateString('fr-FR', { dateStyle: 'long'}) : "....................";

  // Helper date audit
  const formatAuditDate = (date: Date) => {
      return date.toLocaleString('fr-FR', { 
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 print:bg-white print:pb-0">
        
        {/* HEADER DASHBOARD (Caché à l'impression) */}
        <div className="bg-white border-b border-slate-200 py-6 px-8 mb-8 print:hidden">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                     <Link href="/dashboard/owner/leases" className="text-slate-400 hover:text-slate-800 text-sm flex items-center gap-1 mb-2">
                        <ArrowLeft className="w-3 h-3"/> Retour aux contrats
                     </Link>
                     <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Scale className="w-6 h-6 text-slate-800"/>
                        Bail d'Habitation
                     </h1>
                     <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {isCompleted ? 'ACTIF & SIGNÉ' : 'EN ATTENTE DE SIGNATURE'}
                        </span>
                        <p className="text-slate-500 text-sm">Réf: {lease.id.substring(0,8).toUpperCase()}</p>
                     </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link 
                        href={`/properties/flyer/${lease.propertyId}`} 
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-md shadow-sm text-sm font-medium hover:bg-slate-50"
                    >
                        <Printer className="w-4 h-4 text-orange-500" />
                        <span>Affiche</span>
                    </Link>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <ShieldCheck className="w-4 h-4 text-blue-500"/> Certificat
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-4 bg-white">
                             <div className="flex flex-col items-center">
                                <QRCodeSVG value={`https://immofacile.ci/compliance/${lease.id}`} size={120} />
                                <p className="text-[10px] text-slate-400 mt-2 font-mono">SCAN ME</p>
                             </div>
                        </PopoverContent>
                    </Popover>

                    <OwnerContractActions 
                        leaseId={lease.id} 
                        status={lease.signatureStatus}
                        tenantName={tenantName}
                    />
                </div>
            </div>
        </div>

        {/* --- DOCUMENT OFFICIEL (Format A4) --- */}
        <div className="flex justify-center px-4 print:px-0 print:block">
            <div id="printable-contract" className="bg-white text-slate-900 p-[20mm] w-[210mm] min-h-[297mm] shadow-2xl border border-slate-200 print:shadow-none print:border-0 print:w-full mx-auto text-justify leading-relaxed">
                
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
                            <QRCodeSVG value={`https://immofacile.ci/compliance/${lease.id}`} size={65} />
                         </div>
                         <span className="text-[8px] font-mono font-bold text-slate-400">AUTH: {lease.id.substring(0,6).toUpperCase()}</span>
                    </div>
                </div>

                {/* 2. LES PARTIES */}
                <div className="mb-8 font-serif text-sm">
                    <p className="font-bold text-base border-b border-black mb-4 pb-1 uppercase">ENTRE LES SOUSSIGNÉS :</p>
                    
                    <div className="mb-4 pl-4 border-l-2 border-slate-200">
                        <p><strong>LE BAILLEUR :</strong> {ownerName.toUpperCase()}</p>
                        <p>Contact : {lease.property.owner.email}</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Ci-après dénommé "Le Bailleur".</p>
                    </div>

                    <div className="pl-4 border-l-2 border-slate-200">
                        <p><strong>LE PRENEUR :</strong> {tenantName.toUpperCase()}</p>
                        <p>Contact : {lease.tenant.email}</p>
                        <p>Tél : {lease.tenant.phone || "Non renseigné"}</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Ci-après dénommé "Le Preneur".</p>
                    </div>
                </div>

                <p className="font-serif text-center font-bold text-sm italic mb-6">
                    IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :
                </p>

                {/* 3. CLAUSES OBLIGATOIRES (VERSION "BLINDÉE") */}
                <div className="space-y-4 font-serif text-[10px] text-slate-800 mb-8">
                    
                    {/* Colonnes pour optimiser l'espace si besoin, ici on reste en liste lisible */}
                    
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

                {/* 4. SIGNATURES AVEC AUDIT TRAIL (VRAIES DONNÉES) */}
                <div className="mt-auto pt-4 border-t-2 border-black font-sans">
                    <p className="mb-6 text-xs text-right italic font-serif">
                        Fait à Abidjan, le <strong>{new Date().toLocaleDateString('fr-FR', {dateStyle: 'long'})}</strong>, en deux exemplaires originaux.
                    </p>
                    
                    <div className="flex justify-between gap-6 mt-4">
                        
                        {/* === CADRE TECHNIQUE : BAILLEUR (MOI) === */}
                        <div className="w-1/2">
                            <p className="text-[10px] font-bold uppercase mb-2 underline font-serif">Le Bailleur (Signature)</p>
                            
                            {isCompleted && ownerProof ? (
                                <div className="border-2 border-emerald-600 p-3 rounded-sm bg-white text-left">
                                    <p className="text-emerald-600 font-bold text-sm uppercase mb-3">
                                        SIGNÉ ÉLECTRONIQUEMENT
                                    </p>
                                    <div className="font-mono text-[9px] text-slate-500 space-y-1.5 leading-tight">
                                        <p>
                                            <span className="text-emerald-700 font-bold mr-2">Signataire:</span> 
                                            {ownerName.toUpperCase()}
                                        </p>
                                        <p>
                                            <span className="text-emerald-700 font-bold mr-2">Date:</span> 
                                            {formatAuditDate(new Date(ownerProof.signedAt))}
                                        </p>
                                        <p>
                                            <span className="text-emerald-700 font-bold mr-2">IP:</span> 
                                            {ownerProof.ipAddress}
                                        </p>
                                        <p className="truncate">
                                            <span className="text-emerald-700 font-bold mr-2">Preuve ID:</span> 
                                            {ownerProof.id.split('-')[0].toUpperCase()}...
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                                    <p className="text-[9px] text-slate-400 italic">En attente de votre signature</p>
                                </div>
                            )}
                        </div>

                        {/* === CADRE TECHNIQUE : PRENEUR (LOCATAIRE) === */}
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
                                            {tenantName.toUpperCase()}
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
                                    <p className="text-[9px] text-slate-400 italic">En attente du locataire</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
                
                {/* Footer Légal */}
                <div className="mt-8 pt-2 border-t border-slate-200 text-center">
                    <p className="text-[8px] text-slate-400 font-mono">
                        Document généré et sécurisé par ImmoFacile.ci • Hash: {lease.id} • Page 1/1
                    </p>
                </div>

            </div>
        </div>
    </div>
  );
}
