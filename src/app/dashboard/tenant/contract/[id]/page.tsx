import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ContractActions from "@/components/tenant/contract-actions";
import NoticeButton from "@/components/tenant/NoticeButton";
import ClientQRCode from "@/components/shared/ClientQRCode"; 
import { 
  ShieldCheck, ArrowLeft, Scale, Building2 
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { payRentAction } from "@/actions/lease.actions"; // Ajuste le chemin si besoin
import { revalidatePath } from "next/cache";
export const dynamic = 'force-dynamic';


export default async function TenantContractPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");
  const userId = session.user.id;
  const user = session.user;

  const lease = await prisma.lease.findUnique({
    where: { id },
    include: {
        rentSchedules: {
            orderBy: { expectedDate: 'asc' }
        },
        property: {
            include: {
                owner: { select: { id: true, name: true, email: true, phone: true } },
                agency: true 
            }
        },
        signatures: { 
            include: { 
                signer: { select: { id: true, name: true } } 
            } 
        } 
    }
  });

  if (!lease) return notFound();
  if (lease.tenantId !== userId) return redirect("/dashboard/tenant");

  const isTenantSigned = lease.signatureStatus !== 'PENDING';
  
  const tenantProof = lease.signatures.find(p => p.signerId === lease.tenantId);
  const bailleurProof = lease.signatures.find(p => p.signerId !== lease.tenantId);

  const isMandateSignature = bailleurProof && bailleurProof.signerId !== lease.property.owner.id;

  const ownerName = lease.property.owner.name || "LE PROPRIÉTAIRE";
  const tenantName = user.name || "LE LOCATAIRE";
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
    <div className="min-h-screen bg-slate-50 font-sans pb-20 print:bg-white print:pb-0">
        
        <div className="bg-white border-b border-slate-200 py-6 px-8 mb-8 print:hidden">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                     <Link href="/dashboard/tenant" className="text-slate-400 hover:text-slate-800 text-sm flex items-center gap-1 mb-2">
                        <ArrowLeft className="w-3 h-3"/> Retour au tableau de bord
                     </Link>
                     <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Scale className="w-6 h-6 text-slate-800"/>
                        Bail d'Habitation
                     </h1>
                     <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isTenantSigned ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {isTenantSigned ? 'SIGNÉ PAR VOUS' : 'EN ATTENTE DE VOTRE SIGNATURE'}
                        </span>
                        <p className="text-slate-500 text-sm flex items-center gap-1">
                            <Building2 className="w-3 h-3"/> {lease.property.title}
                        </p>
                     </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
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

                    {!isTenantSigned && (
                        <ContractActions 
                            leaseId={lease.id} 
                            isSigned={isTenantSigned} 
                            userName={user.name || "Locataire"}
                        />
                    )}

                    {isTenantSigned && lease.status === 'ACTIVE' && (
                        <div className="bg-white border border-slate-200 p-1.5 rounded-lg flex items-center shadow-sm">
                            <NoticeButton leaseId={lease.id} tenantId={user.id} />
                        </div>
                    )}

                    {lease.status === 'IN_NOTICE' && (
                        <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg border border-orange-200 text-sm font-bold flex items-center gap-2 shadow-sm">
                            🚨 PRÉAVIS EN COURS
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* === ÉCHÉANCIER DES LOYERS (Rent Schedule) === */}
        {lease.rentSchedules && lease.rentSchedules.length > 0 && (
            <div className="max-w-5xl mx-auto mb-8 px-4 print:hidden">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    Échéancier des Loyers
                </h2>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Échéance</th>
                                    <th className="px-6 py-4">Montant</th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {lease.rentSchedules.map((schedule) => {
                                    // Configuration des badges selon le statut
                                    const statusConfig = {
                                        PENDING: { bg: 'bg-slate-100', text: 'text-slate-700', icon: Clock, label: 'En attente' },
                                        PAID: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle, label: 'Payé' },
                                        LATE: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle, label: 'En retard' },
                                        PARTIAL: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock, label: 'Partiel' }
                                    }[schedule.status];

                                    const StatusIcon = statusConfig.icon;

                                    return (
                                        <tr key={schedule.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {new Date(schedule.expectedDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                {schedule.amount.toLocaleString()} FCFA
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {schedule.status === "PENDING" ? (
                                                    <form action={async () => {
                                                        "use server";
                                                        const res = await payRentAction(schedule.id, userId);
                                                        if (res.success) {
                                                            revalidatePath(`/dashboard/tenant/contract/${lease.id}`);
                                                        } 
                                                  }}>
                                                        <Button type="submit" variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700">
                                                            Payer ce mois
                                                        </Button>
                                                   </form>
                                               ) : schedule.status === "PAID" ? (
                                                   <span className="text-slate-400 text-xs">Le {new Date(schedule.paidAt || schedule.updatedAt).toLocaleDateString('fr-FR')}</span>
                                               ) : (
                                                   <span className="text-slate-400 text-xs">-</span>
                                             )}
                                           </td>
                                            
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* --- DOCUMENT OFFICIEL (OPTIMISÉ 1 PAGE - FORCE BRUTE) --- */}
        <style dangerouslySetInnerHTML={{__html: `
            @media print {
                @page { margin: 5mm; size: A4 portrait; }
                body { 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                    -webkit-text-size-adjust: none !important; 
                }
                #printable-contract { 
                    zoom: 0.88; /* Dézoom de 12% pour garantir que tout rentre */
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
                        <p>Contact : {user.email}</p>
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
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 3 : Loyer, Avance et Dépôt de Garantie</h3>
                        <p className="mb-1 print:mb-0">
                            Loyer mensuel : <strong className="text-sm print:text-[9px] mx-1">{lease.monthlyRent.toLocaleString()} FCFA</strong> payable d'avance.
                        </p>
                        
                        {/* 🔒 CORRECTION : Affichage conditionnel de l'avance sur loyer (Loi ivoirienne) */}
                        {lease.advanceAmount && lease.advanceAmount > 0 && (
                            <p className="mb-1 print:mb-0">
                                Avance sur loyer : <strong>{lease.advanceAmount.toLocaleString()} FCFA</strong>. Cette somme sera imputée sur les premiers mois de loyer selon la législation en vigueur.
                            </p>
                        )}
                        
                        <p>
                            Dépôt de garantie (Caution) : <strong>{lease.depositAmount.toLocaleString()} FCFA</strong>. 
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
                                        <p>
                                            <span className="font-bold mr-2 print:mr-1">Signataire:</span> 
                                            {bailleurSignerName?.toUpperCase()}
                                        </p>
                                        <p>
                                            <span className="font-bold mr-2 print:mr-1">Date:</span> 
                                            {formatAuditDate(new Date(bailleurProof.signedAt))}
                                        </p>
                                        <p>
                                            <span className="font-bold mr-2 print:mr-1">IP:</span> 
                                            {bailleurProof.ipAddress}
                                        </p>
                                        <p className="truncate">
                                            <span className="font-bold mr-2 print:mr-1">Preuve ID:</span> 
                                            {bailleurProof.id.split('-')[0].toUpperCase()}...
                                        </p>
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
                                        <p>
                                            <span className="text-blue-700 font-bold mr-2 print:mr-1">Signataire:</span> 
                                            {tenantName.toUpperCase()}
                                        </p>
                                        <p>
                                            <span className="text-blue-700 font-bold mr-2 print:mr-1">Date:</span> 
                                            {formatAuditDate(new Date(tenantProof.signedAt))}
                                        </p>
                                        <p>
                                            <span className="text-blue-700 font-bold mr-2 print:mr-1">IP:</span> 
                                            {tenantProof.ipAddress}
                                        </p>
                                        <p className="truncate">
                                            <span className="text-blue-700 font-bold mr-2 print:mr-1">Preuve ID:</span> 
                                            {tenantProof.id.split('-')[0].toUpperCase()}...
                                        </p>
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
