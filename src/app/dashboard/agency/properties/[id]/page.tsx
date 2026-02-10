import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth"; // Adaptez selon votre chemin d'auth
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { 
  Building, 
  MapPin, 
  User, 
  FileText, 
  AlertTriangle, 
  ArrowLeft,
  Edit,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Force le rendu dynamique pour avoir les données fraîches
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function PropertyDetailsPage({ params }: PageProps) {
  // 1. SÉCURITÉ : Auth Session
  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");

  // 2. SÉCURITÉ : Récupérer l'utilisateur et son agence
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { agencyId: true, role: true }
  });

  if (!user?.agencyId) {
    return <div>Accès refusé : Vous n'êtes pas rattaché à une agence.</div>;
  }

  // 3. DATA : Récupération du Bien avec Sécurité "Row Level" (Agency Isolation)
  // On filtre par ID ET par agencyId. Si pas de match = 404.
  const property = await prisma.property.findFirst({
    where: {
      id: params.id,
      agencyId: user.agencyId // 🔒 VITAL : Empêche de voir les biens d'autres agences
    },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      leases: { 
        where: { isActive: true }, // Seulement le bail actif
        include: { tenant: { select: { name: true } } }
      },
      incidents: {
        where: { status: { not: "CLOSED" } } // Incidents en cours
      },
      _count: { select: { listings: true, missions: true } } // Stats
    }
  });

  if (!property) {
    return notFound(); // Affiche la page 404 native de Next.js
  }

  const activeLease = property.leases[0]; // Le bail actif s'il existe

  return (
    <div className="space-y-6 p-6 pb-20">
      {/* --- HEADER --- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link 
            href="/dashboard/agency/properties" 
            className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour aux biens
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {property.title}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-slate-500">
            <MapPin className="h-4 w-4" />
            <span>{property.address}, {property.commune}</span>
            <Badge 
              variant="outline" 
              className={property.isAvailable 
                ? "bg-green-100 text-green-800 border-green-200" 
                : "bg-gray-100 text-gray-800"
            }
 >
            {property.isAvailable ? "Disponible" : "Loué"}
        </Badge>
          </div>
        </div>

        <div className="flex gap-2">
            {/* Actions rapides */}
            <Button variant="outline" asChild>
                <Link href={`/dashboard/agency/properties/${property.id}/history`}>
                    <History className="mr-2 h-4 w-4" /> Historique
                </Link>
            </Button>

            {/* BOUTON MODIFIER */}
            <Button asChild>
                <Link href={`/dashboard/agency/properties/${property.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Modifier
                </Link>
            </Button>
        </div>
      </div>

      {/* --- GRID DASHBOARD --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* CARTE 1: Info Financières */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loyer Mensuel</CardTitle>
            <span className="font-bold text-primary">FCFA</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{property.price.toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground">
              {property.type} • {property.surface || 0} m²
            </p>
          </CardContent>
        </Card>

        {/* CARTE 2: État Locatif */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locataire en place</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {activeLease ? (
              <div className="space-y-1">
                <p className="text-lg font-medium">{activeLease.tenant.name}</p>
                <p className="text-xs text-muted-foreground">
                  Bail du {activeLease.startDate.toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm italic">
                Aucun locataire actif
              </div>
            )}
          </CardContent>
        </Card>

        {/* CARTE 3: Maintenance */}
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents en cours</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${property.incidents.length > 0 ? "text-red-500" : "text-green-500"}`} />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{property.incidents.length}</div>
            <p className="text-xs text-muted-foreground">
                Requêtes signalées
            </p>
            </CardContent>
        </Card>
      </div>

      {/* --- DETAILS & PROPRIETAIRE --- */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Colonne Principale */}
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Détails du bien</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="block text-sm font-medium text-gray-500">Chambres</span>
                            <span className="block text-lg">{property.bedrooms}</span>
                        </div>
                        <div>
                            <span className="block text-sm font-medium text-gray-500">Salles de bain</span>
                            <span className="block text-lg">{property.bathrooms}</span>
                        </div>
                    </div>
                    <div>
                         <span className="block text-sm font-medium text-gray-500">Description</span>
                         <p className="text-sm text-gray-700 mt-1">
                             {property.description || "Aucune description fournie."}
                         </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Colonne Latérale */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-md">Propriétaire</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-orange-100 p-2 rounded-full">
                            <Building className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">{property.owner.name}</p>
                            <p className="text-xs text-muted-foreground">Mandant</p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium truncate max-w-[150px]">{property.owner.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tel:</span>
                            <span className="font-medium">{property.owner.phone || "-"}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
