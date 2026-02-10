import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, ArrowLeft, Building2, Briefcase } from "lucide-react";
import AgencyContractActions from "@/components/agency/agency-contract-actions"; 

export const dynamic = 'force-dynamic';

export default async function AgencyLeasePage({ params }: { params: { id: string } }) {
  // 1. SÉCURITÉ & SESSION
  const session = await auth();
  if (!session?.user?.agencyId) return redirect("/dashboard/agency");

  // 2. RÉCUPÉRATION DES DONNÉES (SCHEMA STRICT)
  const lease = await prisma.lease.findUnique({
    where: { id: params.id },
    include: {
        property: {
            include: {
                owner: { select: { id: true, name: true, email: true } },
                agency: true // On vérifie l'agence liée
            }
        },
        tenant: { select: { id: true, name: true, email: true, phone: true } },
        // ✅ Relation 'signatures' conforme au schema
        signatures: { 
            include: { 
                signer: { select: { id: true, name: true } } 
            } 
        } 
    }
  });

  // 3. VÉRIFICATIONS D'ACCÈS
  if (!lease) return notFound();
  // SÉCURITÉ : L'agence connectée doit être celle qui gère le bien
  if (lease.property.agencyId !== session.user.agencyId) return redirect("/dashboard/agency");

  const isCompleted = lease.signatureStatus === "COMPLETED";
  const isTenantSigned = lease.signatureStatus !== "PENDING";
  
  // 4. LOGIQUE DE DÉTECTION "MANDAT"
  const bailleurProof = lease.signatures.find(p => p.signerId !== lease.tenantId);
  const tenantProof = lease.signatures.find(p => p.signerId === lease.tenantId);

  // Est-ce signé par un tiers (Agence) ou par le proprio ?
  const isMandateSignature = bailleurProof && bailleurProof.signerId !== lease.property.owner.id;
  
  const ownerName = lease.property.owner.name || "LE PROPRIÉTAIRE";
  const agencyName = lease.property.agency?.name;
  const bailleurSignerName = isMandateSignature ? bailleurProof?.signer.name : ownerName;

  // 5. FORMATAGE
  const startDate = lease.startDate ? new Date(lease.startDate).toLocaleDateString('fr-FR', { dateStyle: 'long'}) : "....................";
  
  const formatAuditDate = (date: Date) => {
      return date.toLocaleString('fr-FR', { 
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
        
        {/* HEADER AGENCE (Style Distinctif) */}
        <div className="bg-white border-b border-slate-200 py-6 px-8 mb-8">
             <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                     <Link href="/dashboard/agency/contracts" className="text-slate-400 text-sm flex items-center gap-1 mb-2 hover:text-purple-600 transition-colors">
                        <ArrowLeft className="w-3 h-3"/> Retour aux dossiers
                     </Link>
                     <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-purple-600"/>
                        Gestion du Bail (Vue Mandataire)
                     </h1>
                     <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700">
                            AGENCE {agencyName?.toUpperCase()}
                        </span>
                        <p className="text-slate-500 text-sm">Réf: {lease.id.substring(0,8).toUpperCase()}</p>
                     </div>
                </div>

                <div className="flex gap-3">
                     {/* Bouton d'action uniquement si locataire a signé et pas encore fini */}
                     {!isCompleted && isTenantSigned && (
                         <AgencyContractActions leaseId={lease.id} />
                     )}
                     
                     {isCompleted && (
                         <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-sm font-medium flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4"/> Dossier Validé
                         </div>
                     )}
                </div>
             </div>
        </div>

        {/* DOCUMENT A4 (STRICTEMENT IDENTIQUE AU PROPRIÉTAIRE/LOCATAIRE) */}
        <div className="flex justify-center px-4">
            <div className="bg-white text-slate-900 p-[20mm] w-[210mm] min-h-[297mm] shadow-xl border border-slate-200 text-justify leading-relaxed">
                
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
                    <div className="mb-4 pl-4 border-l-2 border-slate-200">
                        <p><strong>LE BAILLEUR :</strong> {ownerName.toUpperCase()}</p>
                        <p className="text-xs mt-0.5 text-slate-600">Représenté par son mandataire : <strong>L'Agence {agencyName}</strong></p>
                    </div>
                    <div className="pl-4 border-l-2 border-slate-200">
                        <p><strong>LE PRENEUR :</strong> {lease.tenant.name?.toUpperCase()}</p>
                        <p>Contact : {lease.tenant.email}</p>
                    </div>
                </div>

                <p className="font-serif text-center font-bold text-sm italic mb-6">
                    IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :
                </p>

                {/* 3. CLAUSES OBLIGATOIRES (12 ARTICLES) */}
                <div className="space-y-4 font-serif text-[10px] text-slate-800 mb-8">
                    
                    <div><h3 className="font-bold text-black uppercase mb-0.5">Article 1 : Désignation des Lieux</h3><p>Le Bailleur donne en location au Preneur, qui accepte, les locaux situés à : <strong>{lease.property.title}</strong>.</p></div>
                    
                    <div><h3 className="font-bold text-black uppercase mb-0.5">Article 2 : Durée du Bail</h3><p>Le bail est conclu pour une durée de <strong>UN (1) AN</strong> à compter du <strong>{startDate}</strong>.</p></div>

                    <div className="bg-slate-50 p-2 -mx-2 border-l-4 border-slate-300">
                        <h3 className="font-bold text-black uppercase mb-0.5">Article 3 : Loyer et Dépôt de Garantie</h3>
                        <p>Loyer mensuel : <strong>{lease.monthlyRent.toLocaleString()} FCFA</strong>. Caution : <strong>{lease.depositAmount.toLocaleString()} FCFA</strong>.</p>
                    </div>

                    <div><h3 className="font-bold text-black uppercase mb-0.5">Article 4 : Paiement</h3><p>Exigible le 05 de chaque mois.</p></div>

                    <div><h3 className="font-bold text-black uppercase mb-0.5">Article 5 : Obligations du Preneur</h3><p>Payer le loyer, user paisiblement des lieux, assurer l'entretien courant.</p></div>

                    <div><h3 className="font-bold text-black uppercase mb-0.5">Article 6 : Obligations du Bailleur</h3><p>Délivrer un logement décent, assurer la jouissance paisible, grosses réparations.</p></div>

                    <div><h3 className="font-bold text-black uppercase mb-0.5">Article 7 : Travaux</h3><p>Aucune transformation sans accord écrit.</p></div>

                    <div><h3 className="font-bold text-black uppercase mb-0.5">Article 8 : Sous-location</h3><p>Strictement interdite sans accord écrit.</p></div>

                    <div><h3 className="font-bold text-black uppercase mb-0.5">Article 9 : Droit de Visite</h3><p>Sur rendez-vous pour vérification d'état ou relocation.</p></div>

                    <div><h3 className="font-bold text-black uppercase mb-0.5">Article 10 : Clause Résolutoire</h3><p>Résiliation de plein droit en cas d'impayé après mise en demeure.</p></div>

                    <div><h3 className="font-bold text-black uppercase mb-0.5">Article 11 : État des Lieux</h3><p>Obligatoire à l'entrée et à la sortie.</p></div>

                    <div><h3 className="font-bold text-black uppercase mb-0.5">Article 12 : Litiges</h3><p>Tribunaux du lieu de situation de l'immeuble.</p></div>
                </div>

                {/* 4. SIGNATURES (AVEC CADRE VIOLET POUR AGENCE) */}
                <div className="mt-auto pt-4 border-t-2 border-black font-sans">
                    <p className="mb-6 text-xs text-right italic font-serif">
                        Fait à Abidjan, le <strong>{new Date().toLocaleDateString('fr-FR', {dateStyle: 'long'})}</strong>.
                    </p>
                    
                    <div className="flex justify-between gap-6 mt-4">
                        
                        {/* === CADRE BAILLEUR (C'est VOUS, l'Agence) === */}
                        <div className="w-1/2">
                            <p className="text-[10px] font-bold uppercase mb-2 underline font-serif">Le Bailleur (ou son Mandataire)</p>
                            
                            {isCompleted && bailleurProof ? (
                                <div className={`border-2 p-3 rounded-sm bg-white text-left ${isMandateSignature ? 'border-purple-600 bg-purple-50/20' : 'border-emerald-600'}`}>
                                    <p className={`${isMandateSignature ? 'text-purple-600' : 'text-emerald-600'} font-bold text-sm uppercase mb-3`}>
                                        {isMandateSignature ? "SIGNÉ PAR MANDAT (P/O)" : "SIGNÉ ÉLECTRONIQUEMENT"}
                                    </p>
                                    <div className="font-mono text-[9px] text-slate-500 space-y-1.5 leading-tight">
                                        {isMandateSignature && (
                                            <p className="font-bold text-black">POUR: AGENCE {agencyName?.toUpperCase()}</p>
                                        )}
                                        <p><span className="font-bold mr-2">Signataire:</span> {bailleurSignerName?.toUpperCase()}</p>
                                        <p><span className="font-bold mr-2">Date:</span> {formatAuditDate(new Date(bailleurProof.signedAt))}</p>
                                        <p><span className="font-bold mr-2">IP:</span> {bailleurProof.ipAddress}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 relative group cursor-not-allowed">
                                    <p className="text-[9px] text-slate-400 italic">Zone de signature Mandataire</p>
                                    {!isCompleted && isTenantSigned && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-xs text-purple-600 font-bold">Utilisez le bouton "Signer le Mandat" en haut</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* === CADRE PRENEUR === */}
                        <div className="w-1/2">
                            <p className="text-[10px] font-bold uppercase mb-2 underline font-serif">Le Preneur</p>
                            {isTenantSigned && tenantProof ? (
                                <div className="border-2 border-blue-600 p-3 rounded-sm bg-white text-left">
                                    <p className="text-blue-600 font-bold text-sm uppercase mb-3">SIGNÉ ÉLECTRONIQUEMENT</p>
                                    <div className="font-mono text-[9px] text-slate-500 space-y-1.5 leading-tight">
                                        <p><span className="text-blue-700 font-bold mr-2">Signataire:</span> {lease.tenant.name?.toUpperCase()}</p>
                                        <p><span className="text-blue-700 font-bold mr-2">Date:</span> {formatAuditDate(new Date(tenantProof.signedAt))}</p>
                                        <p><span className="text-blue-700 font-bold mr-2">IP:</span> {tenantProof.ipAddress}</p>
                                    </div>
                                </div>
                            ) : ( <div className="h-32 border border-dashed border-slate-300"/> )}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}
