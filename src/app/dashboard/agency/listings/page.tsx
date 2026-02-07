
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Palmtree, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AgencyListingCard from "@/components/agency/AgencyListingCard";
import Link from "next/link";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function AgencyListingsPage() {
  // 1. SÉCURITÉ ZERO TRUST (Auth v5)
const session = await auth();

// Si aucune session ou pas d'ID utilisateur, redirection immédiate vers le login
if (!session || !session.user?.id) {
  redirect("/login");
}

const userId = session.user.id;

  // 2. VÉRIFICATION RÔLE
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, agencyId: true }
  });

  if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  // 3. DATA FETCHING (Listings + Stats)
  const listings = await prisma.listing.findMany({
    where: {
      agencyId: admin.agencyId // 🔒 SCOPE AGENCE
    },
    include: {
        host: {
            select: { name: true, image: true }
        },
        bookings: {
            where: { 
                status: { in: ["CONFIRMED", "COMPLETED"] } // CA Réel
            },
            select: { totalPrice: true }
        },
        _count: {
            select: { reviews: true, bookings: true }
        }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 4. CALCUL KPI (Live)
  const totalListings = listings.length;
  const totalRevenue = listings.reduce((acc, l) => {
      const listingRevenue = l.bookings.reduce((sum, b) => sum + b.totalPrice, 0);
      return acc + listingRevenue;
  }, 0);
  
  // Listings ayant au moins 1 resa
  const activeListingsCount = listings.filter(l => l._count.bookings > 0).length;
  const activityRate = totalListings > 0 ? Math.round((activeListingsCount / totalListings) * 100) : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-[#020617] text-slate-200">
      
      {/* HEADER & KPI */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
             <Palmtree className="text-orange-500 w-8 h-8" /> Locations Saisonnières
          </h1>
          <p className="text-slate-400 mt-1">
            Pilotez votre parc "Akwaba" (Court Séjour) et maximisez vos taux d'occupation.
          </p>
        </div>
        
        {/* KPI CARDS */}
        <div className="flex gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center min-w-[140px] shadow-lg">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Chiffre d'Affaires</p>
                <p className="text-xl font-black text-emerald-500">{(totalRevenue).toLocaleString()} <span className="text-sm">F</span></p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center min-w-[140px] shadow-lg">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Taux Activité</p>
                <p className="text-xl font-black text-blue-500">{activityRate}%</p>
            </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4 w-full justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-md">
            <div className="relative flex-1 md:max-w-md">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <Input placeholder="Rechercher une annonce..." className="pl-9 bg-slate-950 border-slate-800 text-white h-11 rounded-xl" />
            </div>
            <Link href="/dashboard/agency/listings/create">
                <Button className="w-full md:w-auto bg-orange-600 hover:bg-orange-500 text-white font-bold gap-2 h-11 rounded-xl shadow-lg shadow-orange-900/20">
                    <Plus size={18} /> Créer une annonce
                </Button>
            </Link>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {listings.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Palmtree className="h-8 w-8 text-slate-600" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Aucune annonce saisonnière</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">Ajoutez des biens en courte durée pour augmenter vos revenus et diversifier votre portefeuille.</p>
                <Link href="/dashboard/agency/listings/create">
                    <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">Créer ma première annonce</Button>
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
