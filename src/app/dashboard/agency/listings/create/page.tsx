import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CreateListingForm from "@/components/agency/CreateListingForm";

export const dynamic = 'force-dynamic';

export default async function CreateListingPage() {
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { agency: true }
  });

  // Sécurité stricte
  if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agency) {
    redirect("/dashboard");
  }

  // ✅ CORRECTION : FILTRAGE STRICT PAR AGENCE
  // On ne récupère que les utilisateurs qui appartiennent à VOTRE agence (admin.agency.id)
  const hosts = await prisma.user.findMany({
    where: {
        // Le filtre magique qui cloisonne les données
        agencyId: admin.agency.id, 
        
        // On accepte soit les proprios, soit les admins de l'agence eux-mêmes
        OR: [
            { role: "OWNER" },
            { role: "AGENCY_ADMIN" }
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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Nouvelle Annonce Akwaba</h1>
        <p className="text-slate-400">Créez une annonce pour la location courte durée.</p>
      </div>
      <CreateListingForm hosts={hosts} />
    </div>
  );
}
