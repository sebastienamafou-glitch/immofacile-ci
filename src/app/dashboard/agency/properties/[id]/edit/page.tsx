import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EditPropertyForm from "./edit-form";

export const dynamic = 'force-dynamic';

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  // 1. Auth Check
  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");

  // 2. Récupérer l'utilisateur pour son AgencyID
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { agencyId: true }
  });

  if (!user?.agencyId) return <div>Erreur: Aucune agence associée.</div>;

  // 3. Fetch Data sécurisé (Isolation)
  const property = await prisma.property.findFirst({
    where: {
      id: params.id,
      agencyId: user.agencyId // Sécurité critique
    }
  });

  if (!property) return notFound();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link 
            href={`/dashboard/agency/properties/${property.id}`}
            className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
            <ArrowLeft className="mr-2 h-4 w-4" /> Annuler et retourner aux détails
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Modifier le mandat</h1>
        <p className="text-muted-foreground">
            Mettez à jour les informations du bien "{property.title}". Ces changements seront visibles immédiatement.
        </p>
      </div>

      {/* Formulaire Client */}
      <EditPropertyForm property={property} />
    </div>
  );
}
