import { prisma } from "@/lib/prisma";
import PublicSearchBar from "@/components/akwaba/PublicSearchBar";
import ListingDiscovery from "@/components/akwaba/ListingDiscovery";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BookingStatus } from "@prisma/client"; // ✅ Import obligatoire pour le filtre

export default async function AkwabaListingsPage({ searchParams }: any) {
  const params = await searchParams;

  // 1. Récupération des villes pour l'auto-complétion
  const uniqueCitiesData = await prisma.listing.findMany({
    where: { isPublished: true },
    select: { city: true },
    distinct: ['city'],
  });
  const availableCities = uniqueCitiesData.map(c => c.city);

  // ✅ 2. LOGIQUE ANTI-SURBOOKING
  // On récupère les dates depuis l'URL (injectées par PublicSearchBar)
  const startDate = params.start;
  const endDate = params.end;

  const bookingConflictFilter = startDate && endDate ? {
    none: {
      AND: [
        { startDate: { lt: new Date(endDate) } },
        { endDate: { gt: new Date(startDate) } }
      ],
      OR: [
        { status: { in: [BookingStatus.PAID, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] } },
        { status: BookingStatus.PENDING, createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) } }
      ]
    }
  } : undefined;

  // 3. Requête Prisma avec le filtre de disponibilité
  const listings = await prisma.listing.findMany({
    where: { 
        isPublished: true,
        city: params.city ? { contains: params.city, mode: 'insensitive' } : undefined,
        bookings: bookingConflictFilter // 🛡️ Le filtre magique est appliqué ici
    },
    include: { reviews: true },
  });

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 overflow-x-hidden">
      
      {/* HEADER FIXE */}
      <div className="sticky top-0 z-50 bg-[#0B1120]/90 backdrop-blur-xl border-b border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col lg:flex-row items-center gap-6">
            
            <div className="flex items-center gap-4 shrink-0">
                <Link 
                  href="/akwaba" 
                  className="p-3 rounded-full bg-white/5 border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-slate-400 hover:text-orange-500 transition-all group"
                  title="Retour à l'accueil"
                >
                    <ChevronLeft size={20} className="group-active:scale-90 transition-transform" />
                </Link>

                <Link href="/akwaba" className="text-white font-black text-xl tracking-tighter">
                    BABI<span className="text-orange-500">IMMO</span>
                </Link>
            </div>

            <div className="w-full max-w-4xl">
                <PublicSearchBar availableCities={availableCities} />
            </div>
        </div>
      </div>

      <ListingDiscovery listings={listings} />
    </div>
  );
}
