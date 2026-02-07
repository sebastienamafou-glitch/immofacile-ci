import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";


import Link from "next/link";
import { 
  ShieldCheck, AlertTriangle, ChevronRight, 
  FileText, Scale, CheckCircle2, Clock 
} from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function OwnerCompliancePage() {
  // 1. SÉCURITÉ ZERO TRUST (Auth v5)
  const session = await auth();
  const userId = session?.user?.id;
  
  if (!userId) {
      return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-slate-500 font-medium">Session expirée. Veuillez vous reconnecter.</div>
        </div>
      );
  }

  // 2. RÉCUPÉRATION DES DOSSIERS (Baux)
  const leases = await prisma.lease.findMany({
    where: { 
        property: { ownerId: userId },
        status: { in: ['ACTIVE', 'PENDING'] }
    },
    include: { 
        property: { select: { title: true, address: true, commune: true } }, 
        
        // ✅ CORRECTION SCHEMA : On passe par la relation kyc
        tenant: { 
            select: { 
                name: true, 
                email: true, 
                kyc: { select: { status: true } } // Récupération du statut ici
            } 
        },
        signatures: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 font-sans pb-20">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 bg-[#0B1120] rounded-2xl flex items-center justify-center shadow-lg shadow-slate-300">
            <Scale className="w-8 h-8 text-[#F59E0B]" />
        </div>
        <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centre de Conformité</h1>
            <p className="text-slate-500 font-medium">Audits légaux (Loi 2019) et preuves numériques de vos locations.</p>
        </div>
      </div>

      {/* LISTE DES DOSSIERS */}
      <div className="grid grid-cols-1 gap-4">
        {leases.length > 0 ? (
            leases.map((lease) => {
                // ✅ LOGIQUE MISE À JOUR
                // On vérifie si la signature est présente ou le statut validé
                const isSigned = ['COMPLETED', 'SIGNED_TENANT', 'ACTIVE', 'TERMINATED'].includes(lease.signatureStatus || '') || lease.isActive;
                
                // ✅ ACCÈS SÉCURISÉ AU STATUT KYC (User -> KYC -> Status)
                const isTenantVerified = lease.tenant?.kyc?.status === 'VERIFIED';
                
                const isFullyCompliant = isSigned && isTenantVerified;

                return (
                    <Link 
                        key={lease.id} 
                        href={`/dashboard/compliance/${lease.id}`}
                        className="group block"
                    >
                        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#F59E0B] transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-6">
                            
                            {/* INFO GAUCHE */}
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isFullyCompliant ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {isFullyCompliant ? <ShieldCheck className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-[#F59E0B] transition-colors">
                                        {lease.property.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <span className="font-medium text-slate-700">Locataire:</span> 
                                        {lease.tenant?.name || lease.tenant?.email || "Non assigné"}
                                    </div>
                                </div>
                            </div>

                            {/* STATUTS (Petits badges) */}
                            <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
                                {/* Badge Signature */}
                                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${isSigned ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                                    {isSigned ? <CheckCircle2 className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                                    {isSigned ? "Signé" : "En attente"}
                                </div>

                                {/* Badge KYC */}
                                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${isTenantVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                    {isTenantVerified ? "KYC : OK" : "KYC : PENDING"}
                                </div>
                            </div>

                            {/* FLÈCHE ACTION */}
                            <div className="hidden md:flex items-center text-slate-300 group-hover:translate-x-1 transition-transform duration-300">
                                <ChevronRight className="w-6 h-6" />
                            </div>
                        </div>
                    </Link>
                );
            })
        ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-bold mb-1">Aucun dossier actif</h3>
                <p className="text-slate-500 text-sm">Vos contrats signés et audits apparaîtront ici.</p>
            </div>
        )}
      </div>
    </div>
  );
}
