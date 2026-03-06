import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EditPropertyForm from "./EditPropertyForm";
import { Settings2 } from "lucide-react";
import BackButton from "@/components/shared/BackButton";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPropertyPage(props: PageProps) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // 1. TENTATIVE LONGUE DURÉE : Chercher dans la table Property
  let propertyData: Record<string, unknown> | null = await prisma.property.findFirst({
    where: { 
        id: params.id,
        ownerId: session.user.id 
    }
  }) as Record<string, unknown> | null;

  // 2. TENTATIVE COURTE DURÉE : Si introuvable, chercher dans la table Listing (Akwaba)
  if (!propertyData) {
      propertyData = await prisma.listing.findFirst({
          where: {
              id: params.id,
              hostId: session.user.id
          }
      }) as Record<string, unknown> | null;
  }

  // 3. SI VRAIMENT INTROUVABLE -> Rejet de sécurité
  if (!propertyData) redirect("/dashboard/ambassador/properties");

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <BackButton label="Retour à mes biens" />
        
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight mt-2">
          <Settings2 className="text-orange-500 w-8 h-8" />
          Modifier l'annonce
        </h1>
      </div>
      
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        {/* On passe les données au formulaire client qui s'adaptera tout seul */}
        <EditPropertyForm initialData={propertyData} propertyId={params.id} />
      </div>
    </div>
  );
}
