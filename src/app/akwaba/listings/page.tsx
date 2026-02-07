import { prisma } from "@/lib/prisma";
import PublicSearchBar from "@/components/akwaba/PublicSearchBar";
import ListingDiscovery from "@/components/akwaba/ListingDiscovery";
import Link from "next/link";
import { auth } from "@/auth";

export default async function AkwabaListingsPage({ searchParams }: any) {
  const params = await searchParams;

  // 1. Récupération des villes pour la SearchBar
  const uniqueCitiesData = await prisma.listing.findMany({
    where: { isPublished: true },
    select: { city: true },
    distinct: ['city'],
  });
  const availableCities = uniqueCitiesData.map(c => c.city);

  // 2. Récupération des listings avec Géolocalisation
  const listings = await prisma.listing.findMany({
    where: { 
        isPublished: true,
        city: params.city ? { contains: params.city, mode: 'insensitive' } : undefined
    },
    include: { reviews: true },
  });

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 overflow-x-hidden">
      
      {/* HEADER FIXE */}
      <div className="sticky top-0 z-50 bg-[#0B1120]/90 backdrop-blur-xl border-b border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col lg:flex-row items-center gap-6">
            <Link href="/akwaba" className="text-white font-black text-xl tracking-tighter">
                IMMO<span className="text-orange-500">FACILE</span>
            </Link>
            <div className="w-full max-w-4xl">
                <PublicSearchBar availableCities={availableCities} />
            </div>
        </div>
      </div>

      {/* COMPOSANT INTERACTIF (GRID + MAP) */}
      <ListingDiscovery listings={listings} />
    </div>
  );
}
