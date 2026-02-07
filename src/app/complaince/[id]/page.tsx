import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { 
  ShieldCheck, CheckCircle2, 
  Scale, Server, AlertTriangle, XCircle, MapPin 
} from 'lucide-react';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicCompliancePage({ params }: PageProps) {
  const { id } = await params;

  // 1. RÉCUPÉRATION PUISSANTE (Avec Relations KYC)
  const lease = await prisma.lease.findUnique({
    where: { id: id },
    include: {
      property: {
        include: { 
            owner: {
                // ✅ ON INCLUT LE KYC DU PROPRIO
                include: { kyc: true }
            } 
        }
      },
      tenant: {
        // ✅ ON INCLUT LE KYC DU LOCATAIRE
        include: { kyc: true }
      },
      signatures: true
    }
  });

  if (!lease) return notFound();

  // 2. ALGORITHME DE CONFORMITÉ (Mis à jour v5)
  const legalDepositLimit = lease.monthlyRent * 2;
  const isDepositCompliant = lease.depositAmount <= legalDepositLimit;

  // ✅ CORRECTION : On vérifie via la relation kyc (avec null check)
  const isOwnerVerified = lease.property.owner.kyc?.status === 'VERIFIED';
  const isTenantVerified = lease.tenant.kyc?.status === 'VERIFIED';
  
  // ✅ CORRECTION : On gère les nouveaux statuts de bail (TERMINATED inclus pour l'historique)
  const isSigned = ['COMPLETED', 'SIGNED_TENANT', 'TERMINATED', 'ACTIVE'].includes(lease.signatureStatus || '');
  
  const proof = lease.signatures.length > 0 ? lease.signatures[0] : null;
  const isGlobalCompliant = isDepositCompliant && isOwnerVerified && isTenantVerified;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* NAVBAR SIMPLIFIÉE */}
      <div className="bg-[#0B1120] px-6 py-4 flex justify-between items-center shadow-md">
         <div className="text-white font-black text-xl tracking-tighter flex items-center gap-2">
            IMMO<span className="text-orange-500">FACILE</span>
            <span className="text-[10px] font-normal text-slate-400 bg-white/10 px-2 py-0.5 rounded ml-2">VERIFY</span>
         </div>
         <Link href="/" className="text-xs text-slate-300 hover:text-white transition">Accéder au site</Link>
      </div>

      <div className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-3xl w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
          
          {/* HEADER CERTIFICAT */}
          <div className={`text-white p-6 flex flex-col md:flex-row justify-between items-center border-b-4 ${isGlobalCompliant ? 'bg-slate-900 border-[#F59E0B]' : 'bg-red-900 border-red-500'}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                <Scale className={`w-6 h-6 ${isGlobalCompliant ? 'text-[#F59E0B]' : 'text-red-400'}`} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wide">CERTIFICAT PUBLIQUE</h1>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Preuve d'authenticité Blockchain</p>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              {isGlobalCompliant ? (
                  <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 text-xs font-bold uppercase">
                  <ShieldCheck className="w-3 h-3" /> Document Authentique
                  </div>
              ) : (
                  <div className="inline-flex items-center gap-2 bg-red-500/20 text-red-200 px-3 py-1 rounded-full border border-red-500/30 text-xs font-bold uppercase">
                  <AlertTriangle className="w-3 h-3" /> Non Conforme
                  </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-8">
            
            {/* 1. IDENTIFICATION DU BIEN */}
            <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="p-3 bg-white rounded-lg shadow-sm text-slate-400">
                    <MapPin className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">{lease.property.title}</h3>
                    <p className="text-sm text-slate-500">{lease.property.address}, {lease.property.commune}</p>
                    <div className="mt-2 text-xs font-mono text-slate-500">
                        REF: {lease.id.toUpperCase()}
                    </div>
                </div>
            </div>

            {/* 2. AUDIT LÉGAL */}
            <div>
                 <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">Points de Contrôle</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PublicCheckItem label="Caution (Loi 2019)" valid={isDepositCompliant} />
                    <PublicCheckItem label="Identité Bailleur" valid={isOwnerVerified} />
                    <PublicCheckItem label="Identité Locataire" valid={isTenantVerified} />
                    <PublicCheckItem label="Signature Électronique" valid={isSigned} />
                 </div>
            </div>

            {/* 3. PREUVE TECHNIQUE */}
            <div className="bg-slate-900 rounded-xl p-6 text-slate-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#F59E0B]" /> Audit Trail
                </h3>

                {isSigned && proof ? (
                    <div className="space-y-2 font-mono text-xs">
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-500">Date Signature</span>
                            <span className="text-emerald-400">{format(new Date(proof.signedAt), "dd MMM yyyy à HH:mm", { locale: fr })}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-500">Adresse IP</span>
                            <span className="text-white">{proof.ipAddress}</span>
                        </div>
                        <div className="pt-2">
                            <span className="text-slate-500 block mb-1">Empreinte Numérique (SHA-256)</span>
                            <p className="text-[10px] text-slate-400 break-all bg-black/30 p-2 rounded">
                                {lease.documentHash || "Hash en cours de calcul..."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-orange-400 italic">En attente de signature par les parties.</p>
                )}
            </div>

            <div className="text-center pt-4 border-t border-slate-100">
                 <p className="text-[10px] text-slate-400">
                    Ce certificat est généré dynamiquement par ImmoFacile. Toute modification ultérieure du contrat invalidera ce lien.
                 </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function PublicCheckItem({ label, valid }: { label: string, valid: boolean }) {
    return (
        <div className={`flex items-center justify-between p-3 rounded-lg border ${valid ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <span className={`text-sm font-medium ${valid ? 'text-emerald-900' : 'text-red-900'}`}>{label}</span>
            {valid ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
        </div>
    );
}
