import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CreateListingForm from "./create-form"; // Import du formulaire client

// Rendu dynamique pour avoir les users frais
export const dynamic = 'force-dynamic';

export default async function CreateListingPage() {
  // 1. SÉCURITÉ
  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");

  // 2. RÉCUPÉRATION DU CONTEXTE AGENCE
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, agencyId: true }
  });

  if (!currentUser?.agencyId) {
    return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-red-600">Accès Refusé</h2>
            <p>Vous devez appartenir à une agence pour créer des annonces.</p>
        </div>
    );
  }

  // 3. RÉCUPÉRATION DES HÔTES POTENTIELS (Utilisateurs de l'agence)
  // On récupère tous les membres de l'agence (Admins, Agents, Propriétaires)
  const agencyUsers = await prisma.user.findMany({
    where: {
      agencyId: currentUser.agencyId,
      // Optionnel : Vous pourriez filtrer par rôle ici si besoin
      // role: { in: ['AGENCY_ADMIN', 'AGENT', 'OWNER'] }
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      
      {/* HEADER PAGE */}
      <div>
        <Link 
            href="/dashboard/agency/listings" 
            className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux locations
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Nouvelle Location Saisonnière</h1>
        <p className="text-muted-foreground mt-1">
            Ajoutez un bien au parc "Court Séjour".
        </p>
      </div>

      {/* COMPOSANT CLIENT (FORMULAIRE) */}
      <CreateListingForm 
        potentialHosts={agencyUsers} 
        currentUserId={currentUser.id} 
      />
      
    </div>
  );
}
