import { prisma } from "@/lib/prisma";
import PublicSearchBar from "@/components/akwaba/PublicSearchBar";
import ListingDiscovery from "@/components/akwaba/ListingDiscovery";
import Link from "next/link";
import { ChevronLeft } from "lucide-react"; // ✅ Nouvel import

export default async function AkwabaListingsPage({ searchParams }: any) {
  const params = await searchParams;

  const uniqueCitiesData = await prisma.listing.findMany({
    where: { isPublished: true },
    select: { city: true },
    distinct: ['city'],
  });
  const availableCities = uniqueCitiesData.map(c => c.city);

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
            
            <div className="flex items-center gap-4 shrink-0">
                {/* ✅ BOUTON RETOUR */}
                <Link 
                  href="/akwaba" 
                  className="p-3 rounded-full bg-white/5 border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-slate-400 hover:text-orange-500 transition-all group"
                  title="Retour à l'accueil"
                >
                    <ChevronLeft size={20} className="group-active:scale-90 transition-transform" />
                </Link>

                <Link href="/akwaba" className="text-white font-black text-xl tracking-tighter">
                    IMMO<span className="text-orange-500">FACILE</span>
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
