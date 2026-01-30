import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CreateListingForm from "@/components/agency/CreateListingForm";
import { Palmtree } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function CreateListingPage() {
  // 1. SÉCURITÉ ZERO TRUST
  const headersList = headers();
  const userId = headersList.get("x-user-id");
  
  if (!userId) redirect("/login");

  // 2. VÉRIFICATION ADMIN
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, agencyId: true }
  });

  if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  // 3. CHARGEMENT HÔTES (Cloisonnement Agence)
  const hosts = await prisma.user.findMany({
    where: {
        // Uniquement les membres/clients de CETTE agence
        agencyId: admin.agencyId, 
        
        // Rôles autorisés à être "Hôte"
        OR: [
            { role: "OWNER" },
            { role: "AGENCY_ADMIN" },
            { role: "INVESTOR" } // Ajout possible
        ]
    },
    select: { 
        id: true, 
        name: true, 
        email: true 
    },
    orderBy: {
        name: 'asc'
    }
  });

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-screen bg-[#020617] text-slate-200">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Palmtree className="text-orange-500" /> Nouvelle Annonce
        </h1>
        <p className="text-slate-400 mt-2">Créez une annonce Akwaba pour la location courte durée.</p>
      </div>
      
      {/* Formulaire Client Component sécurisé précédemment */}
      <CreateListingForm hosts={hosts} />
    </div>
  );
}
