import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/shared/print-button";
import ClientQRCode from "@/components/shared/ClientQRCode";
import { FileText, CheckCircle2 } from "lucide-react";
import BackButton from "@/components/shared/BackButton";
import writtenNumber from "written-number";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantReceiptPage(props: PageProps) {
  const params = await props.params;
  const session = await auth();

  // 1. SÉCURITÉ : Vérification de la session
  if (!session?.user?.id) return redirect("/login");

  // 2. RÉCUPÉRATION DES DONNÉES FINANCIÈRES (Transaction unique)
  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      lease: {
        include: {
          property: {
            include: {
              owner: { select: { name: true, email: true, phone: true } },
              agency: { select: { name: true, email: true, phone: true, address: true, taxId: true } }
            }
          },
          tenant: { select: { name: true, email: true, phone: true } }
        }
      }
    }
  });

  // 3. VÉRIFICATIONS D'ACCÈS ET DE STATUT
  if (!payment || !payment.lease) return notFound();
  if (payment.lease.tenantId !== session.user.id) return redirect("/dashboard/tenant");
  
  if (payment.status !== "SUCCESS") {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
            <BackButton className="mb-4" />
            <p>Le paiement n'étant pas validé, la quittance n'est pas disponible.</p>
        </div>
      );
  }

  // 4. PRÉPARATION DES DONNÉES D'AFFICHAGE ET LÉGALES
  const paymentDate = new Date(payment.date);
  const periodMonthYear = paymentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const exactDateString = paymentDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  const landlordName = payment.lease.property.agency 
    ? `Agence ${payment.lease.property.agency.name}` 
    : payment.lease.property.owner.name || "Le Propriétaire";
    
  const tenantName = payment.lease.tenant.name || "Le Locataire";

  // Montant en lettres (Obligation légale)
  const amountInWords = writtenNumber(payment.amount, { lang: 'fr' });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 print:bg-white print:pb-0">
        
        {/* HEADER DASHBOARD LOCATAIRE */}
        <div className="max-w-4xl mx-auto mb-8 pt-10 px-4 print:hidden">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                     <BackButton label="Retour aux quittances" />
                     
                     <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 mt-2">
                        <FileText className="w-7 h-7 text-orange-500"/>
                        Quittance de Loyer
                     </h1>
                     <p className="text-slate-500 text-sm mt-1">Période : <span className="capitalize font-medium text-slate-700">{periodMonthYear}</span></p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4"/> Payé
                    </div>
                    <PrintButton />
                </div>
            </div>
        </div>

        {/* --- DOCUMENT OFFICIEL (A4 PRINT) --- */}
        <div className="flex justify-center px-4 print:px-0 print:block">
            <div id="printable-receipt" className="bg-white text-slate-900 p-[20mm] w-[210mm] min-h-[297mm] shadow-xl border border-slate-200 print:shadow-none print:border-0 print:w-full mx-auto relative">
                
                {/* EN-TÊTE DU DOCUMENT */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-10">
                    <div className="flex-1"> 
                        <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 mb-2">Quittance de Loyer</h1>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                            Mois de : <span className="text-slate-900 font-bold capitalize">{periodMonthYear}</span>
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                         <div className="p-1 border border-slate-200 rounded-lg">
                            <ClientQRCode value={`https://babimmo.ci/verify/receipt/${payment.id}`} size={80} level={"M"} marginSize={1}/>
                         </div>
                         <span className="text-[10px] font-mono font-bold text-slate-400">RÉF: {payment.reference || payment.id.substring(0,8).toUpperCase()}</span>
                    </div>
                </div>

                {/* INFORMATIONS LÉGALES DES PARTIES */}
                <div className="grid grid-cols-2 gap-12 mb-12 text-sm">
                    <div className="space-y-1">
                        <p className="font-bold uppercase text-xs text-slate-500 mb-2 border-b border-slate-200 pb-1">Émis par le Bailleur (ou Mandataire) :</p>
                        <p className="font-black text-lg uppercase">{landlordName}</p>
                        {payment.lease.property.agency ? (
                            <>
                                <p className="text-slate-600">{payment.lease.property.agency.address}</p>
                                {payment.lease.property.agency.taxId && <p className="text-slate-500 text-xs mt-1">NCC/NINEA: {payment.lease.property.agency.taxId}</p>}
                                <p className="text-slate-500 text-xs">Tél: {payment.lease.property.agency.phone}</p>
                            </>
                        ) : (
                            <p className="text-slate-500 text-xs">Tél: {payment.lease.property.owner.phone}</p>
                        )}
                    </div>
                    
                    <div className="space-y-1 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="font-bold uppercase text-xs text-slate-500 mb-2 border-b border-slate-200 pb-1">Délivré au Locataire :</p>
                        <p className="font-black text-lg uppercase">{tenantName}</p>
                        <p className="text-slate-500 text-xs mb-2">Tél: {payment.lease.tenant.phone}</p>
                        
                        <p className="text-slate-600 text-xs font-bold mt-2">Pour les locaux situés à :</p>
                        <p className="font-medium text-slate-800">{payment.lease.property.title}</p>
                        <p className="text-slate-600">{payment.lease.property.address}, {payment.lease.property.commune}</p>
                    </div>
                </div>

                {/* CORPS DU TEXTE LÉGAL (CÔTE D'IVOIRE) */}
                <div className="mb-12 leading-relaxed text-justify text-sm">
                    <p>
                        Je soussigné(e), <strong>{landlordName}</strong>, propriétaire (ou mandataire dûment habilité) du logement désigné ci-dessus, 
                        déclare avoir reçu de <strong>{tenantName}</strong>, locataire, la somme de :
                    </p>
                    
                    <div className="my-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
                        <p className="text-xl font-black text-slate-900">{payment.amount.toLocaleString()} FCFA</p>
                        <p className="text-sm font-medium text-slate-700 italic mt-1">
                            (Arrêté à la somme de : {amountInWords} Francs CFA)
                        </p>
                    </div>

                    <p>
                        Ce montant est versé au titre du paiement intégral du loyer et des charges contractuelles pour la période du <strong>1er au dernier jour du mois de {periodMonthYear}</strong>.
                    </p>
                    
                    <p className="mt-4 text-xs text-slate-500 font-medium">
                        Ce paiement a été réglé avec succès le <strong>{exactDateString}</strong> via la plateforme sécurisée Babimmo. 
                        Cette quittance est délivrée sous réserve de tous mes droits pour le passé comme pour l'avenir, et n'implique aucune renonciation à l'application des clauses du bail.
                    </p>
                </div>

                {/* DÉTAIL FINANCIER */}
                <div className="border border-slate-200 rounded-xl overflow-hidden mb-12">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 font-bold text-slate-700">Désignation</th>
                                <th className="px-4 py-3 font-bold text-slate-700 text-right">Montant (FCFA)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="px-4 py-4 text-slate-600">Loyer et charges contractuelles (Mois de {periodMonthYear})</td>
                                <td className="px-4 py-4 font-medium text-slate-900 text-right">{payment.amount.toLocaleString()}</td>
                            </tr>
                            <tr className="bg-slate-50">
                                <td className="px-4 py-4 font-black text-slate-900 uppercase">Total payé</td>
                                <td className="px-4 py-4 font-black text-xl text-emerald-600 text-right">{payment.amount.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* SIGNATURE / TAMPON NUMÉRIQUE */}
                <div className="mt-16 flex justify-end">
                    <div className="w-72 text-center">
                        <p className="text-xs font-bold text-slate-700 mb-4">LE BAILLEUR / LE MANDATAIRE</p>
                        <div className="border-2 border-emerald-600 text-emerald-600 p-4 rounded-lg transform -rotate-3 inline-block bg-white shadow-sm relative z-10">
                            <p className="font-black text-base uppercase tracking-widest">PAYÉ & CERTIFIÉ</p>
                            <p className="text-[11px] font-mono mt-1 text-emerald-700/90 font-bold">Le {exactDateString}</p>
                            <p className="text-[9px] font-mono mt-0.5 text-emerald-700/60">SYSTÈME BABIMMO</p>
                            <p className="text-[7px] font-mono mt-0.5 text-emerald-700/40">{payment.id}</p>
                        </div>
                    </div>
                </div>

                {/* FOOTER LÉGAL DU DOCUMENT */}
                <div className="absolute bottom-6 left-[20mm] right-[20mm] pt-4 border-t border-slate-200 text-center">
                    <p className="text-[10px] text-slate-400 leading-tight">
                        Cette quittance annule tous les reçus qui auraient pu être donnés pour acompte sur le présent terme. En cas de contestation, la version numérique certifiée générée par Babimmo fait juridiquement foi. Ne pas jeter sur la voie publique.
                    </p>
                </div>

            </div>
        </div>
    </div>
  );
}
