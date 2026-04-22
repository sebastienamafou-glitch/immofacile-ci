import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EditListingForm from "@/components/agency/EditListingForm"; // Ajuste le chemin si besoin

export const dynamic = 'force-dynamic';

export default async function AgencyListingEditPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { agencyId: true }
  });

  if (!user?.agencyId) return redirect("/dashboard");

  // On récupère l'annonce en s'assurant qu'elle appartient bien à l'agence
  const listing = await prisma.listing.findUnique({
    where: { 
      id: params.id, 
      agencyId: user.agencyId 
    }
  });

  if (!listing) return notFound();

  return (
    <div className="p-6">
      <div className="mb-6 max-w-5xl mx-auto space-y-2">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
          Modifier l&apos;annonce
        </h1>
        <p className="text-slate-400">ID : {listing.id}</p>
      </div>

      {/* On injecte les données dans TON formulaire */}
      <EditListingForm initialData={listing} />
    </div>
  );
}
