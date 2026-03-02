import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/shared/print-button";
import ClientQRCode from "@/components/shared/ClientQRCode";
import { ArrowLeft, FileText, CheckCircle2 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function TenantReceiptPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const session = await auth();

  // 1. SÉCURITÉ : Vérification de la session
  if (!session?.user?.id) return redirect("/login");

  // 2. RÉCUPÉRATION DES DONNÉES FINANCIÈRES (Transaction unique)
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      lease: {
        include: {
          property: {
            include: {
              owner: { select: { name: true, email: true, phone: true } },
              agency: { select: { name: true, email: true, phone: true, address: true } }
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
      // On ne génère pas de quittance pour un paiement échoué ou en attente
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
            Le paiement n'étant pas validé, la quittance n'est pas disponible.
        </div>
      );
  }

  // 4. PRÉPARATION DES DONNÉES D'AFFICHAGE
  const paymentDate = new Date(payment.date);
  const periodString = paymentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const exactDateString = paymentDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  const landlordName = payment.lease.property.agency 
    ? `Agence ${payment.lease.property.agency.name} (Mandataire)` 
    : payment.lease.property.owner.name || "Le Propriétaire";
    
  const tenantName = payment.lease.tenant.name || "Le Locataire";

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 print:bg-white print:pb-0">
        
        {/* HEADER DASHBOARD LOCATAIRE */}
        <div className="max-w-4xl mx-auto mb-8 pt-10 px-4 print:hidden">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                     <Link href="/dashboard/tenant/payments" className="text-slate-500 hover:text-orange-500 text-sm flex items-center gap-2 transition-colors mb-2">
                        <ArrowLeft className="w-4 h-4"/> Retour aux paiements
                     </Link>
                     <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <FileText className="w-7 h-7 text-orange-500"/>
                        Quittance de Loyer
                     </h1>
                     <p className="text-slate-500 text-sm mt-1">Période : <span className="capitalize font-medium text-slate-700">{periodString}</span></p>
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
                            Période : <span className="text-slate-900 font-bold">{periodString}</span>
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                         <div className="p-1 border border-slate-200 rounded-lg">
                            <ClientQRCode value={`https://babimmo.ci/verify/receipt/${payment.id}`} size={80} level={"M"} marginSize={1}/>
                         </div>
                         <span className="text-[10px] font-mono font-bold text-slate-400">RÉF: {payment.reference || payment.id.substring(0,8).toUpperCase()}</span>
                    </div>
                </div>

                {/* INFORMATIONS BAILLEUR / LOCATAIRE */}
                <div className="grid grid-cols-2 gap-12 mb-12 text-sm">
                    <div className="space-y-1">
                        <p className="font-bold uppercase text-xs text-slate-500 mb-2 border-b border-slate-200 pb-1">Émis par (Le Bailleur) :</p>
                        <p className="font-black text-lg">{landlordName.toUpperCase()}</p>
                        {payment.lease.property.agency && (
                            <p className="text-slate-600">{payment.lease.property.agency.address}</p>
                        )}
                    </div>
                    
                    <div className="space-y-1 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="font-bold uppercase text-xs text-slate-500 mb-2 border-b border-slate-200 pb-1">Reçu de (Le Locataire) :</p>
                        <p className="font-black text-lg">{tenantName.toUpperCase()}</p>
                        <p className="text-slate-600">Pour le logement situé à :</p>
                        <p className="font-medium text-slate-800">{payment.lease.property.title}</p>
                        <p className="text-slate-600">{payment.lease.property.address}</p>
                    </div>
                </div>

                {/* CORPS DU TEXTE LÉGAL */}
                <div className="mb-12 leading-relaxed text-justify text-sm">
                    <p>
                        Je soussigné(e), <strong>{landlordName}</strong>, propriétaire (ou mandataire) du logement désigné ci-dessus, 
                        déclare avoir reçu de <strong>{tenantName}</strong>, locataire, 
                        la somme de <strong className="text-lg bg-orange-100 px-2 py-0.5 rounded-md">{payment.amount.toLocaleString()} FCFA</strong> 
                        au titre du paiement du loyer et des charges pour la période du mois de <strong>{periodString}</strong>.
                    </p>
                    <p className="mt-4">
                        Ce paiement a été réglé avec succès le <strong>{exactDateString}</strong> par moyen de paiement électronique sécurisé. 
                        Cette somme solde le compte du locataire pour la période indiquée, sous réserve de tous mes droits pour le passé comme pour l'avenir.
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
                                <td className="px-4 py-4 text-slate-600">Loyer de base & charges (Mois de {periodString})</td>
                                <td className="px-4 py-4 font-medium text-slate-900 text-right">{payment.amount.toLocaleString()}</td>
                            </tr>
                            <tr className="bg-slate-50">
                                <td className="px-4 py-4 font-black text-slate-900 uppercase">Total encaissé</td>
                                <td className="px-4 py-4 font-black text-xl text-emerald-600 text-right">{payment.amount.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* SIGNATURE / TAMPON NUMÉRIQUE */}
                <div className="mt-20 flex justify-end">
                    <div className="w-64 text-center">
                        <p className="text-xs text-slate-500 mb-4">Le Bailleur / Mandataire</p>
                        <div className="border-2 border-emerald-600 text-emerald-600 p-4 rounded-lg transform -rotate-2 inline-block">
                            <p className="font-black text-sm uppercase tracking-widest">PAYÉ & CERTIFIÉ</p>
                            <p className="text-[10px] font-mono mt-1 text-emerald-700/80">Le {exactDateString}</p>
                            <p className="text-[8px] font-mono mt-0.5 text-emerald-700/60">BABIMMO SECURE SYSTEM</p>
                        </div>
                    </div>
                </div>

                {/* FOOTER DOCUMENT */}
                <div className="absolute bottom-8 left-[20mm] right-[20mm] pt-4 border-t border-slate-200 text-center">
                    <p className="text-[9px] text-slate-400">
                        Cette quittance annule tous les reçus qui auraient pu être donnés pour acompte sur le présent terme. En cas de contestation, la version numérique certifiée par Babimmo fait foi.
                    </p>
                </div>

            </div>
        </div>
    </div>
  );
}
