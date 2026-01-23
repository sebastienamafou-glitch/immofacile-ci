import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditListingForm from "@/components/agency/EditListingForm";

export const dynamic = 'force-dynamic';

export default async function EditListingPage({ params }: { params: { listingId: string } }) {
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { agency: true }
  });

  if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agencyId) {
    redirect("/dashboard");
  }

  // 1. Récupération du Listing avec vérification stricte du périmètre Agence
  const listing = await prisma.listing.findUnique({
    where: {
        id: params.listingId,
        agencyId: admin.agencyId // 🔒 Le mur de sécurité
    }
  });

  if (!listing) {
    // Si l'annonce n'existe pas OU n'appartient pas à l'agence : redirection
    redirect("/dashboard/agency/listings");
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
         <h1 className="text-2xl font-black text-white">Éditer l'annonce</h1>
         <p className="text-slate-400">Modification de <span className="text-orange-500 font-bold">{listing.title}</span></p>
      </div>
      
      {/* On passe les données initiales au composant client */}
      <EditListingForm initialData={listing} />
    </div>
  );
}
