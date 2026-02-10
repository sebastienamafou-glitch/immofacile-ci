import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Palmtree, Plus, Search, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AgencyListingCard from "@/components/agency/AgencyListingCard"; // Assurez-vous que ce composant existe

// Force le rendu dynamique pour des KPIs temps réel
export const dynamic = 'force-dynamic';

export default async function AgencyListingsPage() {
  // 1. SÉCURITÉ : Auth & Rôle
  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, agencyId: true }
  });

  if (!user?.agencyId) return redirect("/dashboard");

  // 2. DATA FETCHING OPTIMISÉ
  const listings = await prisma.listing.findMany({
    where: {
      agencyId: user.agencyId // 🔒 Isolation Agence
    },
    include: {
        host: { select: { name: true, image: true } },
        bookings: {
            where: { status: { in: ["CONFIRMED", "COMPLETED"] } }, // Seules les réservations validées comptent
            select: { totalPrice: true }
        },
        _count: { select: { reviews: true, bookings: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 3. CALCUL DES KPIS (Business Logic)
  const totalRevenue = listings.reduce((acc, l) => {
      return acc + l.bookings.reduce((sum, b) => sum + b.totalPrice, 0);
  }, 0);
  
  const activeListingsCount = listings.filter(l => l._count.bookings > 0).length;
  const activityRate = listings.length > 0 
    ? Math.round((activeListingsCount / listings.length) * 100) 
    : 0;

  return (
    <div className="space-y-8 p-6 pb-20">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
             <Palmtree className="h-8 w-8 text-primary" /> 
             Locations Saisonnières
          </h1>
          <p className="text-muted-foreground">
            Gérez votre parc "Court Séjour" et suivez vos performances.
          </p>
        </div>
        
        <Link href="/dashboard/agency/listings/create">
            <Button className="w-full md:w-auto shadow-lg">
                <Plus className="mr-2 h-4 w-4" /> Créer une annonce
            </Button>
        </Link>
      </div>

      {/* KPI SECTION */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chiffre d'Affaires Global</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} FCFA</div>
                <p className="text-xs text-muted-foreground">Revenus générés sur la plateforme</p>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taux d'Activité</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{activityRate}%</div>
                <p className="text-xs text-muted-foreground">Annonces ayant au moins 1 réservation</p>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Parc Immobilier</CardTitle>
                <Palmtree className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{listings.length}</div>
                <p className="text-xs text-muted-foreground">Mandats courte durée actifs</p>
            </CardContent>
        </Card>
      </div>

      {/* SEARCH TOOLBAR */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher par titre ou ville..."
              className="pl-8"
            />
        </div>
      </div>

      {/* LISTINGS GRID */}
      {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/50">
                <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
                    <Palmtree className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Aucune annonce disponible</h3>
                <p className="text-muted-foreground mb-6 text-center max-w-sm">
                    Commencez par ajouter votre premier bien en gestion saisonnière.
                </p>
                <Link href="/dashboard/agency/listings/create">
                    <Button variant="outline">Créer ma première annonce</Button>
                </Link>
            </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
                <AgencyListingCard key={listing.id} listing={listing} />
            ))}
        </div>
      )}
    </div>
  );
}
