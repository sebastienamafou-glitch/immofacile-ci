import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Palmtree, Plus, Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AgencyListingCard from "@/components/agency/AgencyListingCard";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function AgencyListingsPage() {
  // 1. Auth & Agency Check
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { agency: true }
  });

  if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agency) {
    redirect("/dashboard");
  }

  // 2. Data Fetching (Listings + Stats)
  const listings = await prisma.listing.findMany({
    where: {
      agencyId: admin.agency.id // 🔒 SCOPE AGENCE
    },
    include: {
        host: {
            select: { name: true, image: true } // Info Propriétaire
        },
        bookings: {
            where: { 
                status: { in: ["CONFIRMED", "COMPLETED"] } // Seulement le CA réel
            },
            select: { totalPrice: true }
        },
        _count: {
            select: { reviews: true, bookings: true }
        }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 3. Calcul des KPI Globaux (Live)
  const totalListings = listings.length;
  const totalRevenue = listings.reduce((acc, l) => {
      const listingRevenue = l.bookings.reduce((sum, b) => sum + b.totalPrice, 0);
      return acc + listingRevenue;
  }, 0);
  
  // Taux de remplissage global (Simplifié : Listings ayant au moins 1 resa active / Total)
  const activeListingsCount = listings.filter(l => l._count.bookings > 0).length;
  const activityRate = totalListings > 0 ? Math.round((activeListingsCount / totalListings) * 100) : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      {/* HEADER & KPI */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
             <Palmtree className="text-orange-500" /> Locations Saisonnières
          </h1>
          <p className="text-slate-400 mt-1">
            Pilotez votre parc "Akwaba" (Court Séjour) et maximisez vos taux d'occupation.
          </p>
        </div>
        
        {/* KPI CARDS */}
        <div className="flex gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center min-w-[120px]">
                <p className="text-xs text-slate-500 uppercase font-bold">Chiffre d'Affaires</p>
                <p className="text-xl font-black text-emerald-500">{(totalRevenue).toLocaleString()} F</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center min-w-[120px]">
                <p className="text-xs text-slate-500 uppercase font-bold">Taux Activité</p>
                <p className="text-xl font-black text-blue-500">{activityRate}%</p>
            </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex gap-3 w-full md:w-auto justify-between bg-slate-900/50 p-2 rounded-xl border border-slate-800">
            <div className="relative flex-1 md:max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input placeholder="Rechercher une annonce..." className="pl-9 bg-slate-950 border-slate-800 text-white" />
            </div>
            <Link href="/dashboard/agency/listings/create">
                <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold gap-2">
                    <Plus size={18} /> Créer une annonce
                </Button>
            </Link>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                <Palmtree className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-white font-bold text-lg">Aucune annonce saisonnière</h3>
                <p className="text-slate-500 mb-6">Ajoutez des biens en courte durée pour augmenter vos revenus.</p>
                <Link href="/dashboard/agency/listings/create">
                    <Button variant="outline">Créer ma première annonce</Button>
                </Link>
            </div>
        ) : (
            listings.map((listing) => (
                <AgencyListingCard key={listing.id} listing={listing} />
            ))
        )}
      </div>
    </div>
  );
}
