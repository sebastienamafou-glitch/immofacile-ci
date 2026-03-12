import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OwnerContractActions from "@/components/owner/owner-contract-actions";
import { acknowledgeNoticeAction } from "@/actions/lease.actions";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import ClientQRCode from "@/components/shared/ClientQRCode"; 
import RefundDepositModal from "@/components/owner/RefundDepositModal";
import { 
  ShieldCheck, ArrowLeft, Printer, Scale, Building2 
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function OwnerLeasePage({ params }: { params: { id: string } }) {
  // ✅ CORRECTION : Accès synchrone et direct à params.id
  const id = params.id;

  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");

  // 1. RÉCUPÉRATION DES DONNÉES (STRUCTURE IDENTIQUE AU LOCATAIRE)
  const lease = await prisma.lease.findUnique({
    where: { id },
    include: {
        property: {
            include: {
                // On inclut l'agence pour la détection du mandat
                owner: { select: { id: true, name: true, email: true } },
                agency: true 
            }
        },
        tenant: { select: { id: true, name: true, email: true, phone: true } },
        signatures: { 
            include: { 
                signer: { select: { id: true, name: true } } 
            } 
        } 
    }
  });

  // 2. SÉCURITÉ
  if (!lease) return notFound();
  // Vérification : L'utilisateur doit être le PROPRIÉTAIRE
  if (lease.property.owner.id !== session.user.id) return redirect("/dashboard/owner");

  const isCompleted = lease.signatureStatus === "COMPLETED";
  const isTenantSigned = lease.signatureStatus !== "PENDING"; 

  // 3. LOGIQUE INTELLIGENTE (MIROIR DU LOCATAIRE)
  
  // A. Signature Locataire
  const tenantProof = lease.signatures.find(p => p.signerId === lease.tenant.id);
  
  // B. Signature Bailleur (Peut être moi OU mon agent)
  // On cherche une signature qui N'EST PAS celle du locataire
  const bailleurProof = lease.signatures.find(p => p.signerId !== lease.tenant.id);

  // C. Détection Mandat
  const isMandateSignature = bailleurProof && bailleurProof.signerId !== lease.property.owner.id;

  // D. Noms d'affichage
  const ownerName = lease.property.owner.name || "LE PROPRIÉTAIRE";
  const tenantName = lease.tenant.name || "LE LOCATAIRE";
  const agencyName = lease.property.agency?.name;
  const bailleurSignerName = isMandateSignature ? bailleurProof?.signer.name : ownerName;

  // 4. FORMATAGE
  const startDate = lease.startDate ? new Date(lease.startDate).toLocaleDateString('fr-FR', { dateStyle: 'long'}) : "....................";

  const formatAuditDate = (date: Date) => {
      return date.toLocaleString('fr-FR', { 
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 print:bg-white print:pb-0">
        
        {/* HEADER DASHBOARD PROPRIÉTAIRE (Spécifique, différent du locataire) */}
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
                        <p className="text-slate-500 text-sm flex items-center gap-1">
                            <Building2 className="w-3 h-3"/> {lease.property.title}
                        </p>
                     </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link 
                        href={`/properties/flyer/${lease.propertyId}`} 
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-md shadow-sm text-sm font-medium hover:bg-slate-50 transition-colors"
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
                                <ClientQRCode 
                                    value={`https://immofacile.ci/compliance/${lease.id}`} 
                                    size={120} 
                                    level={"H"}
                                />
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

        {/* === ALERTE PRÉAVIS (Si statut IN_NOTICE) === */}
        {lease.status === "IN_NOTICE" && (
            <div className="max-w-5xl mx-auto mb-8 px-4 print:hidden">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-100 p-2 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-red-900 font-bold text-lg">Préavis de départ reçu</h3>
                            <p className="text-red-700 text-sm mt-1">
                                Le locataire a signifié son intention de quitter les lieux le : 
                                <strong className="ml-1 text-red-900">
                                    {lease.plannedDepartureDate ? new Date(lease.plannedDepartureDate).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : "Date non précisée"}
                                </strong>.
                            </p>
                        </div>
                    </div>

                    {/* Action form pour valider le départ */}
                    <form action={async () => {
                        "use server";
                        await acknowledgeNoticeAction(lease.id, session.user.id);
                        revalidatePath(`/dashboard/owner/leases/${lease.id}`);
                    }}>
                        <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Acter le départ (Libérer le bien)
                        </Button>
                    </form>
                </div>
            </div>
        )}

        {/* === ACTION DE FIN DE BAIL : RESTITUTION CAUTION === */}
        {lease.status === "TERMINATED" && (
            <div className="max-w-5xl mx-auto mb-8 px-4 print:hidden">
                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    <div>
                        <h3 className="text-slate-900 font-bold text-lg">Bail terminé</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Ce contrat est clôturé. Vous pouvez maintenant procéder à la restitution de la caution sur le portefeuille du locataire.
                        </p>
                    </div>
        
                    <RefundDepositModal 
                        leaseId={lease.id}
                        tenantName={tenantName}
                        depositAmount={lease.depositAmount}
                        ownerId={session.user.id}
                    />
                </div>
            </div>
        )}

        {/* --- DOCUMENT OFFICIEL --- */}
        <style dangerouslySetInnerHTML={{__html: `
            @media print {
                @page { margin: 5mm; size: A4 portrait; }
                body { 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                    -webkit-text-size-adjust: none !important; 
                }
                #printable-contract { 
                    zoom: 0.88; 
                } 
            }
        `}} />

        <div className="flex justify-center px-4 print:px-0 print:block">
            <div id="printable-contract" className="bg-white text-slate-900 p-[20mm] print:p-[5mm] w-[210mm] min-h-[297mm] shadow-2xl border border-slate-200 print:shadow-none print:border-0 print:w-full mx-auto text-justify leading-relaxed print:leading-[1.1] relative flex flex-col">
                
                {/* 1. EN-TÊTE LEGAL */}
                <div className="flex justify-between items-start border-b-2 border-black pb-6 print:pb-2 mb-8 print:mb-2">
                    <div className="flex-1 pr-4"> 
                        <h1 className="text-2xl print:text-lg font-serif font-black uppercase tracking-wide mb-2 print:mb-0.5">Contrat de Bail <br/>à Usage d'Habitation</h1>
                        <p className="text-[10px] print:text-[8px] italic text-slate-500 font-serif">
                            Soumis aux dispositions impératives de la Loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat.
                        </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                         <div className="border border-slate-800 p-1 print:p-0.5">
                            <ClientQRCode 
                                value={`https://immofacile.ci/compliance/${lease.id}`} 
                                size={65}
                                level={"H"}
                                marginSize={1}
                            />
                         </div>
                         <span className="text-[8px] print:text-[6px] font-mono font-bold text-slate-400">AUTH: {lease.id.substring(0,6).toUpperCase()}</span>
                    </div>
                </div>

                {/* 2. LES PARTIES */}
                <div className="mb-8 print:mb-2 font-serif text-sm print:text-[10px]">
                    <p className="font-bold text-base print:text-xs border-b border-black mb-4 print:mb-1 pb-1 uppercase">ENTRE LES SOUSSIGNÉS :</p>
                    
                    <div className="mb-4 print:mb-1 pl-4 border-l-2 border-slate-200">
                        <p><strong>LE BAILLEUR :</strong> {ownerName.toUpperCase()}</p>
                        {lease.property.agency && (
                            <p className="text-xs print:text-[8px] mt-0.5 text-slate-600">Représenté par son mandataire : <strong>L'Agence {lease.property.agency.name}</strong></p>
                        )}
                        <p className="text-xs print:text-[8px] text-slate-500 mt-1 print:mt-0 italic">Ci-après dénommé "Le Bailleur".</p>
                    </div>

                    <div className="pl-4 border-l-2 border-slate-200">
                        <p><strong>LE PRENEUR :</strong> {tenantName.toUpperCase()}</p>
                        <p>Contact : {lease.tenant.email}</p>
                        <p>Tél : {lease.tenant.phone || "Non renseigné"}</p>
                        <p className="text-xs print:text-[8px] text-slate-500 mt-1 print:mt-0 italic">Ci-après dénommé "Le Preneur".</p>
                    </div>
                </div>

                <p className="font-serif text-center font-bold text-sm print:text-[10px] italic mb-6 print:mb-2">
                    IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :
                </p>

                {/* 3. CLAUSES OBLIGATOIRES (12 ARTICLES) */}
                <div className="space-y-4 print:space-y-1 font-serif text-[10px] print:text-[8.5px] text-slate-800 mb-8 print:mb-2 flex-1">
                    
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

                    <div className="bg-slate-50 print:bg-transparent print:border-l-2 p-2 print:p-0.5 print:-mx-0.5 -mx-2 border-l-4 border-slate-300">
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 3 : Loyer, Dépôt de Garantie et Avance</h3>
                        <p className="mb-1 print:mb-0">
                            Loyer mensuel : <strong className="text-sm print:text-[9px] mx-1">{lease.monthlyRent.toLocaleString()} FCFA</strong> payable d'avance.
                        </p>
                        <p>
                            Dépôt de garantie (Caution) : <strong>{lease.depositAmount.toLocaleString()} FCFA</strong>.<br/>
                            Avance sur loyer : <strong>{(lease.advanceAmount || 0).toLocaleString()} FCFA</strong>.<br/>
                            Le dépôt de garantie ne pourra en aucun cas s'imputer sur le paiement des loyers et sera restitué au Preneur après l'état des lieux de sortie, déduction faite des sommes dues au titre des réparations locatives.
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

                {/* 4. SIGNATURES AVEC AUDIT TRAIL */}
                <div className="mt-auto pt-4 print:pt-1 border-t-2 border-black font-sans shrink-0">
                    <p className="mb-6 print:mb-1 text-xs print:text-[8px] text-right italic font-serif">
                        Fait à Abidjan, le <strong>{new Date().toLocaleDateString('fr-FR', {dateStyle: 'long'})}</strong>, en deux exemplaires originaux.
                    </p>
                    
                    <div className="flex justify-between gap-6 print:gap-2 mt-4 print:mt-1">
                        
                        {/* BAILLEUR */}
                        <div className="w-1/2">
                            <p className="text-[10px] print:text-[8px] font-bold uppercase mb-2 print:mb-0.5 underline font-serif">Le Bailleur (ou son Mandataire)</p>
                            
                            {bailleurProof ? (
                                <div className={`border-2 p-3 print:p-1 rounded-sm bg-white text-left ${isMandateSignature ? 'border-purple-600' : 'border-emerald-600'}`}>
                                    <p className={`${isMandateSignature ? 'text-purple-600' : 'text-emerald-600'} font-bold text-sm print:text-[7px] uppercase mb-3 print:mb-0.5`}>
                                        {isMandateSignature ? "SIGNÉ PAR MANDAT (P/O)" : "SIGNÉ ÉLECTRONIQUEMENT"}
                                    </p>
                                    <div className="font-mono text-[9px] print:text-[6px] text-slate-500 space-y-1.5 print:space-y-0 leading-tight">
                                        
                                        {isMandateSignature && (
                                            <p className="font-bold text-black">POUR: AGENCE {agencyName?.toUpperCase()}</p>
                                        )}
                                        
                                        <p><span className="font-bold mr-2 print:mr-1">Signataire:</span> {bailleurSignerName?.toUpperCase()}</p>
                                        <p><span className="font-bold mr-2 print:mr-1">Date:</span> {formatAuditDate(new Date(bailleurProof.signedAt))}</p>
                                        <p><span className="font-bold mr-2 print:mr-1">IP:</span> {bailleurProof.ipAddress}</p>
                                        <p className="truncate"><span className="font-bold mr-2 print:mr-1">Preuve:</span> {bailleurProof.id.split('-')[0].toUpperCase()}...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 print:h-12 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 print:bg-transparent">
                                    <p className="text-[9px] print:text-[7px] text-slate-400 italic">En attente de signature</p>
                                </div>
                            )}
                        </div>

                        {/* PRENEUR */}
                        <div className="w-1/2">
                            <p className="text-[10px] print:text-[8px] font-bold uppercase mb-2 print:mb-0.5 underline font-serif">Le Preneur (Lu et approuvé)</p>
                            
                            {isTenantSigned && tenantProof ? (
                                <div className="border-2 border-blue-600 p-3 print:p-1 rounded-sm bg-white text-left">
                                    <p className="text-blue-600 font-bold text-sm print:text-[7px] uppercase mb-3 print:mb-0.5">
                                        SIGNÉ ÉLECTRONIQUEMENT
                                    </p>
                                    <div className="font-mono text-[9px] print:text-[6px] text-slate-500 space-y-1.5 print:space-y-0 leading-tight">
                                        <p><span className="text-blue-700 font-bold mr-2 print:mr-1">Signataire:</span> {tenantName.toUpperCase()}</p>
                                        <p><span className="text-blue-700 font-bold mr-2 print:mr-1">Date:</span> {formatAuditDate(new Date(tenantProof.signedAt))}</p>
                                        <p><span className="text-blue-700 font-bold mr-2 print:mr-1">IP:</span> {tenantProof.ipAddress}</p>
                                        <p className="truncate"><span className="text-blue-700 font-bold mr-2 print:mr-1">Preuve:</span> {tenantProof.id.split('-')[0].toUpperCase()}...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 print:h-12 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 print:bg-transparent">
                                    <p className="text-[9px] print:text-[7px] text-slate-400 italic">En attente du locataire</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
                
                {/* Footer Légal */}
                <div className="mt-8 print:mt-2 pt-2 print:pt-1 border-t border-slate-200 text-center shrink-0">
                    <p className="text-[8px] print:text-[6px] text-slate-400 font-mono">
                        Document certifié par Babimmo.ci • Audit ID: {lease.id} • Page 1/1
                    </p>
                </div>

            </div>
        </div>
    </div>
  );
}
