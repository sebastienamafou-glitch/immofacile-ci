import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EditPropertyForm from "./EditPropertyForm";
import { Settings2 } from "lucide-react";
import BackButton from "@/components/shared/BackButton"; // ✅ Notre nouveau composant

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPropertyPage(props: PageProps) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Sécurité : On s'assure que le bien appartient bien à cet ambassadeur
  const property = await prisma.property.findFirst({
    where: { 
        id: params.id,
        ownerId: session.user.id 
    }
  });

  if (!property) redirect("/dashboard/ambassador/properties");

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
        {/* On passe les données existantes au formulaire client */}
        <EditPropertyForm initialData={property} propertyId={property.id} />
      </div>
    </div>
  );
}
