import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { 
  ShieldCheck, FileText, CheckCircle2, 
  Scale, Server, Fingerprint, AlertTriangle, XCircle, MapPin, Download 
} from 'lucide-react';
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompliancePage({ params }: PageProps) {
  const { id } = await params;

  // 1. SÉCURITÉ ZERO TRUST
  const headersList = headers();
  const userId = headersList.get("x-user-id");
  
  if (!userId) return redirect("/login");

  // 2. RÉCUPÉRATION DES DONNÉES
  const lease = await prisma.lease.findUnique({
    where: { id: id },
    include: {
      property: {
        include: { owner: true }
      },
      tenant: true,
      signatures: true
    }
  });

  if (!lease) return notFound();

  // 3. VÉRIFICATION DES DROITS (RBAC AVANCÉ)
  // ✅ CORRECTION TS : On sélectionne agencyId explicitement
  const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { id: true, role: true, agencyId: true } 
  });

  const isOwner = lease.property.ownerId === userId;
  const isTenant = lease.tenantId === userId; // ✅ Le locataire a bien l'accès
  const isStaff = ["SUPER_ADMIN", "ADMIN"].includes(user?.role || "");
  
  // Droit pour l'agence qui gère le bien
  const isAgencyAdmin = user?.role === "AGENCY_ADMIN" && 
                        user?.agencyId && 
                        lease.property.agencyId && 
                        user.agencyId === lease.property.agencyId;

  // 🛑 BARRIÈRE DE SÉCURITÉ
  if (!isOwner && !isTenant && !isStaff && !isAgencyAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-600 font-bold p-4 text-center">
            <ShieldCheck className="w-12 h-12 mb-4 mx-auto text-red-500" />
            <p>ACCÈS REFUSÉ : Violation du périmètre de sécurité.</p>
            <p className="text-sm font-normal text-slate-500 mt-2">Ce document juridique est strictement confidentiel.</p>
        </div>
      );
  }

  // 4. ALGORITHME DE CONFORMITÉ
  const legalDepositLimit = lease.monthlyRent * 2;
  const isDepositCompliant = lease.depositAmount <= legalDepositLimit;

  const isOwnerVerified = lease.property.owner.kycStatus === 'VERIFIED' || lease.property.owner.isVerified;
  const isTenantVerified = lease.tenant.kycStatus === 'VERIFIED' || lease.tenant.isVerified;
  
  const isSigned = lease.signatureStatus === 'COMPLETED' || lease.signatureStatus === 'SIGNED_TENANT';
  const proof = lease.signatures.length > 0 ? lease.signatures[0] : null;

  const isGlobalCompliant = isDepositCompliant && isOwnerVerified && isTenantVerified;

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount);

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-4xl w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* HEADER */}
        <div className={`text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b-4 ${isGlobalCompliant ? 'bg-[#0B1120] border-[#F59E0B]' : 'bg-red-900 border-red-500'}`}>
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
              <Scale className={`w-6 h-6 ${isGlobalCompliant ? 'text-[#F59E0B]' : 'text-red-400'}`} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">CERTIFICAT DE CONFORMITÉ</h1>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Infrastucture ImmoFacile • RCI</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isGlobalCompliant ? (
                <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 text-xs font-bold uppercase">
                <ShieldCheck className="w-3 h-3" /> Document Authentique
                </div>
            ) : (
                <div className="inline-flex items-center gap-2 bg-red-500/20 text-red-200 px-3 py-1 rounded-full border border-red-500/30 text-xs font-bold uppercase">
                <AlertTriangle className="w-3 h-3" /> Anomalies Détectées
                </div>
            )}
            {/* BOUTON TÉLÉCHARGEMENT PDF */}
            <a 
                href={`/api/documents/compliance/${lease.id}`} 
                target="_blank"
                className="flex items-center gap-2 text-[10px] font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition"
            >
                <Download className="w-3 h-3" /> TÉLÉCHARGER LE CERTIFICAT
            </a>
          </div>
        </div>

        {/* CORPS DU DOCUMENT */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* GAUCHE : ANALYSE LÉGALE */}
          <div className="md:col-span-2 space-y-6">
            
            <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="p-3 bg-white rounded-lg shadow-sm text-slate-400">
                    <MapPin className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">{lease.property.title}</h3>
                    <p className="text-sm text-slate-500">{lease.property.address}, {lease.property.commune}</p>
                    <div className="mt-2 flex gap-4 text-xs font-mono text-slate-600">
                        <span>Loyer: <strong>{formatMoney(lease.monthlyRent)}</strong></span>
                        <span>Caution: <strong>{formatMoney(lease.depositAmount)}</strong></span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" /> Audit Automatisé (Loi 2019-576)
                  </h3>
                  {isGlobalCompliant && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">100% CONFORME</span>}
              </div>
              
              <div className="divide-y divide-slate-100">
                <ComplianceRow 
                    isValid={isDepositCompliant} 
                    label="Plafonnement Caution (Max 2 mois)" 
                    detail={`Requis: ${formatMoney(legalDepositLimit)} | Actuel: ${formatMoney(lease.depositAmount)}`} 
                />
                <ComplianceRow 
                    isValid={isOwnerVerified} 
                    label="Identité Bailleur (KYC)" 
                    detail={lease.property.owner.name || lease.property.owner.email || "Non renseigné"} 
                />
                <ComplianceRow 
                    isValid={isTenantVerified} 
                    label="Identité Locataire (KYC)" 
                    detail={lease.tenant.name || lease.tenant.email || "Non renseigné"} 
                />
              </div>
            </div>
          </div>

          {/* DROITE : PREUVE TECHNIQUE */}
          <div className="bg-slate-900 rounded-xl p-6 text-slate-300 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>

            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Server className="w-4 h-4 text-[#F59E0B]" /> Preuve Numérique
              </h3>

              {isSigned && proof ? (
                <ul className="space-y-6 relative border-l border-slate-700 ml-2 pl-6">
                    <li className="relative">
                    <span className="absolute -left-[29px] top-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                    <p className="text-[10px] text-slate-500 font-mono mb-1">
                        {format(new Date(proof.signedAt), "yyyy-MM-dd HH:mm:ss", { locale: fr })} UTC
                    </p>
                    <p className="text-xs font-bold text-white">Signature Validée</p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded w-fit">
                        <Fingerprint className="w-3 h-3" /> IP: {proof.ipAddress}
                    </div>
                    </li>
                    <li className="relative">
                    <span className="absolute -left-[29px] top-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900"></span>
                    <p className="text-[10px] text-slate-500 font-mono mb-1">
                         {format(new Date(lease.createdAt), "yyyy-MM-dd HH:mm:ss", { locale: fr })} UTC
                    </p>
                    <p className="text-xs font-bold text-white">Création Dossier</p>
                    </li>
                </ul>
              ) : (
                <div className="text-center py-10 opacity-50">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                    <p className="text-sm text-slate-400">En attente de signature</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
               <div className="flex items-center gap-2 mb-2 text-[#F59E0B]">
                  <Fingerprint className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Empreinte (Hash)</span>
               </div>
               <p className="font-mono text-[9px] text-slate-500 break-all leading-relaxed">
                  {lease.documentHash || "En attente de génération..."}
               </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-center flex flex-col items-center">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">
                Document certifié par ImmoFacile
            </p>
             <div className="text-[9px] text-slate-300 font-mono">
                ID Unique: {lease.id}
             </div>
        </div>
      </div>
    </div>
  );
}

// Composant utilitaire pour les lignes de conformité
function ComplianceRow({ isValid, label, detail }: { isValid: boolean, label: string, detail: string }) {
    return (
        <div className="flex justify-between items-center p-4 hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
            {isValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
                <XCircle className="w-5 h-5 text-red-500" /> // Ou AlertTriangle selon la sévérité
            )}
            <div>
                <span className="text-sm font-bold text-slate-700 block">{label}</span>
                <span className="text-xs text-slate-500">{detail}</span>
            </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${isValid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {isValid ? 'Valide' : 'Non Conforme'}
            </span>
        </div>
    );
}
