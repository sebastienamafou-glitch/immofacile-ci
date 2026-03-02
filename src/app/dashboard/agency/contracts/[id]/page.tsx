import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import { acknowledgeNoticeAction } from "@/actions/lease.actions";
import RefundDepositModal from "@/components/owner/RefundDepositModal";
import { prisma } from "@/lib/prisma";
import AgencyContractActions from "@/components/agency/agency-contract-actions"; 
import ClientQRCode from "@/components/shared/ClientQRCode"; 
import PrintButton from "@/components/shared/print-button"; 
import { 
  ShieldCheck, ArrowLeft, Briefcase, Building2 
} from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AgencyLeasePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const session = await auth();

  // SÉCURITÉ : Vérification de la session agence
  if (!session?.user?.agencyId) return redirect("/dashboard/agency");

  // 1. RÉCUPÉRATION DES DONNÉES
  const lease = await prisma.lease.findUnique({
    where: { id },
    include: {
        property: {
            include: {
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

  // 2. VÉRIFICATIONS D'ACCÈS
  if (!lease) return notFound();
  if (lease.property.agencyId !== session.user.agencyId) return redirect("/dashboard/agency");

  const isCompleted = lease.signatureStatus === "COMPLETED";
  const isTenantSigned = lease.signatureStatus !== "PENDING"; 

  // 3. LOGIQUE DE SIGNATURE (MIROIR DU PROPRIÉTAIRE)
  const tenantProof = lease.signatures.find(p => p.signerId === lease.tenant.id);
  const bailleurProof = lease.signatures.find(p => p.signerId !== lease.tenant.id);
  const isMandateSignature = bailleurProof && bailleurProof.signerId !== lease.property.owner.id;

  const ownerName = lease.property.owner.name || "LE PROPRIÉTAIRE";
  const tenantName = lease.tenant.name || "LE LOCATAIRE";
  const agencyName = lease.property.agency?.name;
  const bailleurSignerName = isMandateSignature ? bailleurProof?.signer.name : ownerName;

  const startDate = lease.startDate ? new Date(lease.startDate).toLocaleDateString('fr-FR', { dateStyle: 'long'}) : "....................";

  const formatAuditDate = (date: Date) => {
      return date.toLocaleString('fr-FR', { 
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });
  };

  return (
    <div className="min-h-screen bg-[#0B1120] font-sans pb-20 print:bg-white print:pb-0">
        
        {/* HEADER DASHBOARD AGENCE */}
        <div className="max-w-5xl mx-auto mb-8 pt-10 print:hidden px-4">
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                     <Link href="/dashboard/agency/contracts" className="text-slate-500 hover:text-purple-400 text-sm flex items-center gap-2 transition-colors mb-2">
                        <ArrowLeft className="w-4 h-4"/> Retour aux dossiers
                     </Link>
                     <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                        <Briefcase className="w-8 h-8 text-purple-500"/>
                        Gestion du Bail
                     </h1>
                     <div className="flex items-center gap-3 mt-1">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest">
                            AGENCE {agencyName?.toUpperCase()}
                        </span>
                        <p className="text-slate-500 text-sm italic">Réf: {lease.id.substring(0,8).toUpperCase()}</p>
                     </div>
                </div>

                <div className="flex items-center gap-3">
                    <PrintButton /> {/* ✅ Corrige l'erreur onClick */}

                    {!isCompleted && isTenantSigned && (
                         <AgencyContractActions leaseId={lease.id} />
                    )}
                    
                    {isCompleted && (
                         <div className="px-6 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl text-sm font-bold flex items-center gap-2">
                             <ShieldCheck className="w-5 h-5"/> Dossier Validé
                         </div>
                     )}
                </div>
            </div>
        </div>

        {/* === ALERTE PRÉAVIS (Si statut IN_NOTICE) === */}
        {lease.status === "IN_NOTICE" && (
            <div className="max-w-5xl mx-auto mb-8 px-4 print:hidden">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-500/20 p-2 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-red-400 font-bold text-lg">Préavis de départ reçu</h3>
                            <p className="text-slate-400 text-sm mt-1">
                                Le locataire a signifié son intention de quitter les lieux le : 
                                <strong className="ml-1 text-red-300">
                                    {lease.plannedDepartureDate ? new Date(lease.plannedDepartureDate).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : "Date non précisée"}
                                </strong>.
                            </p>
                        </div>
                    </div>
                    
                    <form action={async () => {
                        "use server";
                        // L'agence agit en tant que mandataire pour valider
                        await acknowledgeNoticeAction(lease.id, lease.property.ownerId);
                        revalidatePath(`/dashboard/agency/contracts/${lease.id}`);
                    }}>
                        <button type="submit" className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                            <CheckCircle2 className="w-4 h-4" />
                            Acter le départ
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* === ACTION DE FIN DE BAIL : RESTITUTION CAUTION === */}
        {lease.status === "TERMINATED" && (
            <div className="max-w-5xl mx-auto mb-8 px-4 print:hidden">
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
                    <div>
                        <h3 className="text-white font-bold text-lg">Bail terminé</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            Ce contrat est clôturé. Vous pouvez procéder à la restitution de la caution vers le locataire (imputé sur le portefeuille du mandant).
                        </p>
                    </div>
                    
                    <RefundDepositModal 
                        leaseId={lease.id}
                        tenantName={tenantName}
                        depositAmount={lease.depositAmount}
                        ownerId={lease.property.ownerId}
                    />
                </div>
            </div>
        )}

        {/* --- DOCUMENT OFFICIEL (TEXTE INTÉGRAL DU BAIL PROPRIÉTAIRE) --- */}
        <div className="flex justify-center px-4 print:px-0 print:block">
            <div id="printable-contract" className="bg-white text-slate-900 p-[20mm] w-[210mm] min-h-[297mm] shadow-2xl border border-slate-200 print:shadow-none print:border-0 print:w-full mx-auto text-justify leading-relaxed font-serif">
                
                <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                    <div className="flex-1 pr-4"> 
                        <h1 className="text-2xl font-black uppercase tracking-wide mb-2">Contrat de Bail <br/>à Usage d'Habitation</h1>
                        <p className="text-[10px] italic text-slate-500">
                            Soumis aux dispositions impératives de la Loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat.
                        </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                         <div className="border border-black p-1">
                            <ClientQRCode value={`https://babimmo.ci/compliance/${lease.id}`} size={65} level={"H"} marginSize={1}/>
                         </div>
                         <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-tighter">AUTH: {lease.id.substring(0,6).toUpperCase()}</span>
                    </div>
                </div>

                <div className="mb-8 text-sm">
                    <p className="font-bold border-b border-black mb-4 pb-1 uppercase">ENTRE LES SOUSSIGNÉS :</p>
                    <div className="mb-4 pl-4 border-l-2 border-slate-200">
                        <p><strong>LE BAILLEUR :</strong> {ownerName.toUpperCase()}</p>
                        {lease.property.agency && (
                            <p className="text-xs mt-0.5 text-slate-600 italic">Représenté par son mandataire : <strong>L'Agence {agencyName}</strong></p>
                        )}
                        <p className="text-xs text-slate-500 mt-1 italic">Ci-après dénommé "Le Bailleur".</p>
                    </div>
                    <div className="pl-4 border-l-2 border-slate-200">
                        <p><strong>LE PRENEUR :</strong> {tenantName.toUpperCase()}</p>
                        <p>Contact : {lease.tenant.email} | Tél : {lease.tenant.phone || "Non renseigné"}</p>
                        <p className="text-xs text-slate-500 mt-1 italic">Ci-après dénommé "Le Preneur".</p>
                    </div>
                </div>

                <p className="text-center font-bold text-xs italic mb-6">IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :</p>

                {/* LES 12 ARTICLES COMPLETS (NON TRONQUÉS) */}
                <div className="space-y-4 text-[10px] text-slate-800">
                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5 tracking-tighter">Article 1 : Désignation des Lieux</h3>
                        <p>Le Bailleur donne en location au Preneur, qui accepte, les locaux situés à : <strong>{lease.property.title}, {lease.property.address}</strong>. Le bien comprend : {lease.property.bedrooms} chambre(s), {lease.property.bathrooms} salle(s) d'eau. Le Preneur déclare prendre les lieux dans l'état où ils se trouvent lors de l'entrée en jouissance.</p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5 tracking-tighter">Article 2 : Durée du Bail</h3>
                        <p>Le bail est conclu pour une durée de <strong>UN (1) AN</strong> à compter du <strong>{startDate}</strong>. Il se renouvellera par tacite reconduction pour la même durée, sauf dénonciation par l'une des parties par acte extrajudiciaire ou lettre recommandée avec accusé de réception, moyennant un préavis de trois (3) mois.</p>
                    </div>

                    <div className="bg-slate-50 p-3 border-l-4 border-slate-300 font-serif">
                        <h3 className="font-bold text-black uppercase mb-1 tracking-tighter">Article 3 : Loyer et Dépôt de Garantie</h3>
                        <p className="mb-1">Loyer mensuel : <strong>{lease.monthlyRent.toLocaleString()} FCFA</strong> payable d'avance.</p>
                        <p>Dépôt de garantie : <strong>{lease.depositAmount.toLocaleString()} FCFA</strong>. Cette somme ne pourra en aucun cas s'imputer sur le paiement des loyers et sera restituée au Preneur après l'état des lieux de sortie, déduction faite des sommes dues au titre des réparations locatives.</p>
                        {lease.advanceAmount && <p className="mt-1">Avance sur loyer encaissée : <strong>{lease.advanceAmount.toLocaleString()} FCFA</strong>.</p>}
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5 tracking-tighter">Article 4 : Paiement et Pénalités</h3>
                        <p>Le loyer est exigible le 05 de chaque mois. Tout retard de paiement au-delà du 10 du mois entraînera de plein droit l'application d'une pénalité de 10% sur le montant dû, sans préjudice de l'action en résiliation.</p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5 tracking-tighter">Article 5 : Obligations du Preneur</h3>
                        <p>Le Preneur s'oblige à : 1) Payer le loyer aux termes convenus. 2) User paisiblement des locaux suivant la destination bourgeoise prévue. 3) Entretenir les lieux en bon état de réparations locatives (plomberie, électricité, serrures, vitres). 4) Ne pas troubler la jouissance paisible des voisins.</p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5 tracking-tighter">Article 6 : Obligations du Bailleur</h3>
                        <p>Le Bailleur est tenu de : 1) Délivrer au Preneur le logement en bon état d'usage et de réparation. 2) Assurer au Preneur la jouissance paisible du logement. 3) Entretenir les locaux en état de servir à l'usage prévu par le contrat (grosses réparations, clos et couvert).</p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5 tracking-tighter">Article 7 : Travaux et Transformations</h3>
                        <p>Le Preneur ne pourra faire aucuns travaux de transformation ou de perçage de gros œuvre sans l'accord écrit et préalable du Bailleur. À défaut d'accord, le Bailleur pourra exiger la remise en état des lieux aux frais du Preneur lors de son départ.</p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5 tracking-tighter">Article 8 : Cession et Sous-location</h3>
                        <p>Toute cession de bail ou sous-location, même partielle ou temporaire, est strictement interdite sans l'accord écrit du Bailleur. En cas de non-respect, le bail sera résilié immédiatement de plein droit.</p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5 tracking-tighter">Article 9 : Droit de Visite</h3>
                        <p>Le Bailleur ou son représentant pourra visiter les lieux pour vérifier leur état d'entretien, sur rendez-vous pris 48h à l'avance. En cas de mise en vente ou de relocation, le Preneur devra laisser visiter les lieux deux heures par jour les jours ouvrables.</p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5 tracking-tighter">Article 10 : Clause Résolutoire</h3>
                        <p>À défaut de paiement d'un seul terme de loyer à son échéance ou d'inexécution d'une seule des conditions du bail, et un mois après un commandement de payer ou une mise en demeure resté infructueux, le bail sera résilié de plein droit si bon semble au Bailleur.</p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5 tracking-tighter">Article 11 : État des Lieux</h3>
                        <p>Un état des lieux contradictoire sera établi lors de la remise des clés et lors de leur restitution. À défaut d'état des lieux de sortie, le Preneur sera présumé avoir reçu les lieux en bon état de réparations locatives.</p>
                    </div>

                    <div>
                        <h3 className="font-bold text-black uppercase mb-0.5 tracking-tighter">Article 12 : Élection de Domicile et Litiges</h3>
                        <p>Pour l'exécution des présentes, les parties font élection de domicile en leurs demeures respectives. En cas de litige, compétence est attribuée aux tribunaux du lieu de situation de l'immeuble.</p>
                    </div>
                </div>

                {/* SIGNATURES ET AUDIT TRAIL */}
                <div className="mt-auto pt-4 border-t-2 border-black">
                    <p className="mb-6 text-xs text-right italic font-serif">
                        Fait à Abidjan, le <strong>{new Date().toLocaleDateString('fr-FR', {dateStyle: 'long'})}</strong>.
                    </p>
                    
                    <div className="flex justify-between gap-6 mt-4">
                        <div className="w-1/2">
                            <p className="text-[10px] font-bold uppercase mb-2 underline">Le Bailleur (ou son Mandataire)</p>
                            {bailleurProof ? (
                                <div className={`border-2 p-3 rounded-sm bg-white text-left ${isMandateSignature ? 'border-purple-600' : 'border-emerald-600'}`}>
                                    <p className={`${isMandateSignature ? 'text-purple-600' : 'text-emerald-600'} font-bold text-[10px] uppercase mb-2`}>
                                        {isMandateSignature ? "SIGNÉ PAR MANDAT (P/O)" : "SIGNÉ ÉLECTRONIQUEMENT"}
                                    </p>
                                    <div className="font-mono text-[8px] text-slate-500 space-y-1 leading-tight">
                                        <p><span className="font-bold">Signataire:</span> {bailleurSignerName?.toUpperCase()}</p>
                                        <p><span className="font-bold">Date:</span> {formatAuditDate(new Date(bailleurProof.signedAt))}</p>
                                        <p className="truncate"><span className="font-bold">Preuve ID:</span> {bailleurProof.id.substring(0,8).toUpperCase()}...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-28 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 text-[9px] text-slate-400 italic font-sans">Attente signature mandataire</div>
                            )}
                        </div>

                        <div className="w-1/2">
                            <p className="text-[10px] font-bold uppercase mb-2 underline">Le Preneur (Lu et approuvé)</p>
                            {isTenantSigned && tenantProof ? (
                                <div className="border-2 border-blue-600 p-3 rounded-sm bg-white text-left text-blue-600">
                                    <p className="font-bold text-[10px] uppercase mb-2">SIGNÉ ÉLECTRONIQUEMENT</p>
                                    <div className="font-mono text-[8px] text-slate-500 space-y-1 leading-tight">
                                        <p><span className="font-bold text-blue-700">Signataire:</span> {tenantName.toUpperCase()}</p>
                                        <p><span className="font-bold text-blue-700">Date:</span> {formatAuditDate(new Date(tenantProof.signedAt))}</p>
                                        <p><span className="font-bold text-blue-700">IP:</span> {tenantProof.ipAddress}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-28 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 text-[9px] text-slate-400 italic font-sans">Attente du locataire</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-2 border-t border-slate-100 text-center">
                    <p className="text-[8px] text-slate-400 font-mono tracking-widest uppercase">
                        Certification Babimmo • Dossier n° {lease.id.substring(0,12).toUpperCase()}
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
}
