import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditListingForm from "@/components/agency/EditListingForm";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function EditListingPage({ params }: { params: { listingId: string } }) {
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

  // 3. RÉCUPÉRATION SÉCURISÉE DU LISTING (Périmètre Agence)
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
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen bg-[#020617] text-slate-200">
      
      {/* HEADER SIMPLE */}
      <div className="mb-8 border-b border-slate-800 pb-6 flex items-center justify-between">
         <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <Edit className="text-orange-500 w-8 h-8" /> Édition Annonce
            </h1>
            <p className="text-slate-400 mt-2">Modification de <span className="text-white font-bold">{listing.title}</span></p>
         </div>
      </div>
      
      {/* Composant Client Sécurisé */}
      <EditListingForm initialData={listing} />
    </div>
  );
}
