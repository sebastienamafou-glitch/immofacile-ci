import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Building2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
// 👇 IMPORT CORRECT
import AgencyPropertyCard from "@/components/agency/AgencyPropertyCard";

export const dynamic = 'force-dynamic';

export default async function AgencyPropertiesPage() {
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { agency: true }
  });

  if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agency) {
    redirect("/dashboard");
  }

  // Requête optimisée conforme au Schema Property [cite: 24]
  const properties = await prisma.property.findMany({
    where: {
      agencyId: admin.agency.id // 🔒 SÉCURITÉ : Uniquement les biens de l'agence
    },
    include: {
        owner: {
            select: { name: true }
        },
        leases: {
            where: { isActive: true } // Pour déterminer le statut occupé/vacant
        },
        _count: {
            select: { incidents: true } // Pour les alertes
        }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
             <Building2 className="text-orange-500" /> Biens Sous Gestion
          </h1>
          <p className="text-slate-400 mt-1">
            Parc Immobilier Longue Durée ({properties.length} mandats)
          </p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            <Link href="/dashboard/agency/properties/create">
                <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold gap-2">
                    <Plus size={18} /> Nouveau Mandat
                </Button>
            </Link>
        </div>
      </div>

      {/* LISTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                <Building2 className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-white font-bold text-lg">Aucun mandat actif</h3>
                <p className="text-slate-500 mb-6">Ajoutez un bien pour commencer la gestion locative.</p>
                <Link href="/dashboard/agency/properties/create">
                    <Button variant="outline">Créer un mandat</Button>
                </Link>
            </div>
        ) : (
            properties.map((property) => (
                <AgencyPropertyCard key={property.id} property={property} />
            ))
        )}
      </div>
    </div>
  );
}
