import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  FileSignature, 
  Briefcase, 
  Building2, 
  User, 
  Wallet, 
  ArrowUpRight 
} from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AgencyContractsIndex() {
  // 1. SÉCURITÉ : Vérification d'accès Agence
  const session = await auth();
  if (!session?.user?.agencyId) return redirect("/dashboard/agency");

  // 2. REQUÊTE : Données enrichies pour l'affichage
  const leases = await prisma.lease.findMany({
    where: {
      property: { agencyId: session.user.agencyId }
    },
    include: {
      property: { select: { title: true, address: true, images: true } },
      tenant: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER : Haute Visibilité */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Briefcase className="w-8 h-8 text-purple-500"/>
              </div>
              Gestion des Contrats
            </h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              {leases.length} mandat(s) de gestion actifs sous votre enseigne
            </p>
          </div>
          <Link href="/dashboard/agency/contracts/new">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-6 rounded-xl shadow-lg shadow-purple-900/20 transition-all hover:scale-105">
              <FileSignature className="w-5 h-5 mr-2" />
              Nouveau Contrat
            </Button>
          </Link>
        </div>

        {/* LISTE DES CONTRATS (Cards au lieu de Table pour meilleure lisibilité) */}
        <div className="grid gap-4">
          {leases.length === 0 ? (
            <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl p-20 text-center">
              <Briefcase className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Aucun contrat enregistré pour le moment.</p>
            </div>
          ) : (
            leases.map((lease) => {
              const isCompleted = lease.signatureStatus === 'COMPLETED';
              const isTenantSigned = lease.signatureStatus === 'SIGNED_TENANT';
              const isPending = lease.signatureStatus === 'PENDING';

              return (
                <div key={lease.id} className="group relative bg-slate-900/40 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition-all duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    
                    {/* BIEN & ADRESSE */}
                    <div className="lg:col-span-4 flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        <Building2 className="w-8 h-8 text-slate-500" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-white text-lg group-hover:text-purple-400 transition-colors">
                          {lease.property.title}
                        </h3>
                        <p className="text-slate-500 text-sm flex items-center gap-1">
                          {lease.property.address}
                        </p>
                      </div>
                    </div>

                    {/* LOCATAIRE */}
                    <div className="lg:col-span-3 border-l border-slate-800/50 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{lease.tenant.name}</p>
                          <p className="text-xs text-slate-500">{lease.tenant.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* FINANCES : Contrasté */}
                    <div className="lg:col-span-2 border-l border-slate-800/50 pl-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-emerald-400 font-black">
                          <Wallet className="w-4 h-4" />
                          <span>{lease.monthlyRent.toLocaleString()} F</span>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                          Caution: {lease.depositAmount.toLocaleString()} F
                        </div>
                      </div>
                    </div>

                    {/* STATUT & ACTION */}
                    <div className="lg:col-span-3 flex items-center justify-end gap-4">
                      <div className="text-right">
                        {isCompleted && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Actif & Signé
                          </Badge>
                        )}
                        {isTenantSigned && (
                          <Badge className="bg-purple-500 text-white border-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
                            Action Mandat
                          </Badge>
                        )}
                        {isPending && (
                          <Badge variant="outline" className="border-slate-700 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            En attente
                          </Badge>
                        )}
                      </div>

                      <Link href={`/dashboard/agency/contracts/${lease.id}`}>
                        <Button size="icon" className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-purple-600 text-white transition-all border border-slate-700 shadow-xl">
                          <ArrowUpRight className="w-5 h-5" />
                        </Button>
                      </Link>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
