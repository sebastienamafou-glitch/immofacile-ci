import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileSignature, Briefcase } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AgencyContractsIndex() {
  // 1. SÉCURITÉ : Vérifier que c'est bien une Agence
  const session = await auth();
  if (!session?.user?.agencyId) return redirect("/dashboard/agency");

  // 2. REQUÊTE : Récupérer uniquement les baux de l'agence
  const leases = await prisma.lease.findMany({
    where: {
      property: {
        agencyId: session.user.agencyId // 🔒 FILTRE CRITIQUE
      }
    },
    include: {
      property: { select: { title: true, address: true } },
      tenant: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-purple-600"/>
                Gestion des Contrats
            </h1>
            <p className="text-slate-500 text-sm mt-1">
                {leases.length} bail(s) sous mandat de gestion
            </p>
        </div>
      </div>

      {/* TABLEAU DES BAUX */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Bien Immobilier</TableHead>
              <TableHead>Locataire</TableHead>
              <TableHead>Loyer / Caution</TableHead>
              <TableHead>Statut Signature</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leases.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-32 text-slate-400">
                        Aucun contrat de bail trouvé pour votre agence.
                    </TableCell>
                </TableRow>
            ) : (
                leases.map((lease) => {
                    // Calcul du statut pour affichage
                    const isCompleted = lease.signatureStatus === 'COMPLETED';
                    const isTenantSigned = lease.signatureStatus === 'SIGNED_TENANT';
                    const isPending = lease.signatureStatus === 'PENDING';

                    return (
                        <TableRow key={lease.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span>{lease.property.title}</span>
                                    <span className="text-xs text-slate-400">{lease.property.address}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span>{lease.tenant.name}</span>
                                    <span className="text-xs text-slate-400">{lease.tenant.email}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="text-xs font-mono">
                                    <p>L: {lease.monthlyRent.toLocaleString()} FCFA</p>
                                    <p className="text-slate-400">C: {lease.depositAmount.toLocaleString()} FCFA</p>
                                </div>
                            </TableCell>
                            <TableCell>
                                {isCompleted && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Actif & Signé</Badge>}
                                {isTenantSigned && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 animate-pulse">Action Requise (Mandat)</Badge>}
                                {isPending && <Badge variant="outline" className="text-slate-500">Attente Locataire</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                                {/* C'EST ICI QUE SE FAIT LE LIEN */}
                                <Link href={`/dashboard/agency/contracts/${lease.id}`}>
                                    <Button size="sm" variant={isTenantSigned ? "default" : "outline"} className={isTenantSigned ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}>
                                        {isTenantSigned ? (
                                            <>
                                                <FileSignature className="w-4 h-4 mr-2" />
                                                Signer (P/O)
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="w-4 h-4 mr-2" />
                                                Voir
                                            </>
                                        )}
                                    </Button>
                                </Link>
                            </TableCell>
                        </TableRow>
                    );
                })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
