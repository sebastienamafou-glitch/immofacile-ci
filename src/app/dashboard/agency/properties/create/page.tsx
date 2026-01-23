import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CreatePropertyForm from "@/components/agency/CreatePropertyForm";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function CreatePropertyPage() {
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { agency: true }
  });

  if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agency) {
    redirect("/dashboard");
  }

  // Récupérer les utilisateurs ayant le rôle OWNER et liés à l'agence (ou sans agence pour l'instant)
  // Dans un système strict Multi-Tenant, on prendrait 'where: { agencyId: admin.agency.id, role: "OWNER" }'
  // Pour faciliter le test, on prend tous les OWNERs disponibles
  const owners = await prisma.user.findMany({
    where: { 
        role: "OWNER",
        // Optionnel : agencyId: admin.agency.id 
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-black text-white">Nouveau Mandat</h1>
            <p className="text-slate-400">Ajouter un bien immobilier à votre portefeuille de gestion.</p>
        </div>
        
        {/* Raccourci si aucun propriétaire n'existe */}
        {owners.length === 0 && (
            <Link href="/dashboard/agency/team"> 
                <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500/10 gap-2">
                    <UserPlus size={16} /> Créer un Propriétaire d'abord
                </Button>
            </Link>
        )}
      </div>

      <CreatePropertyForm owners={owners} />
      
    </div>
  );
}
